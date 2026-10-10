import type { BrowserContext, Page } from '@playwright/test';
import { Role, type User, type Menu, type Franchise, type Order } from '../src/service/pizzaService';

export const users = {
  diner: { id: '3', name: 'Kai Chen', email: 'd@jwt.com', password: 'a', roles: [{ role: Role.Diner }] },
  admin: { id: '1', name: 'Ada Admin', email: 'admin@jwt.com', password: 'a', roles: [{ role: Role.Admin }] },
  franchisee: { id: '2', name: 'Fran Owner', email: 'owner@jwt.com', password: 'a', roles: [{ role: Role.Diner }, { role: Role.Franchisee, objectId: '2' }] },
} satisfies Record<string, User>;

export const menu: Menu = [
  { id: '1', title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
  { id: '2', title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
];

export interface ApiRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  body: any;
  authorization: string | undefined;
}

/** A fresh in-memory backend for each test. Only intercepted requests reach this state. */
export class ApiMock {
  accounts: User[] = structuredClone(Object.values(users));
  private nextUserId = 9;
  user: User | null = null;
  sessionExpired = false;
  registrationError = false;
  paymentError = false;
  deletionError = false;
  verificationError = false;
  verificationNetworkError = false;
  requests: ApiRequest[] = [];
  orders: Order[] = [];
  franchises: Franchise[] = [
    { id: '2', name: 'LotaPizza', admins: [{ name: 'Fran Owner', email: users.franchisee.email }], stores: [{ id: '4', name: 'Lehi', totalRevenue: 12 }, { id: '5', name: 'Springville', totalRevenue: 8 }] },
    { id: '3', name: 'PizzaCorp', stores: [{ id: '7', name: 'Spanish Fork', totalRevenue: 4 }] },
    { id: '4', name: 'topSpot', stores: [] },
    { id: '5', name: 'LastSlice', stores: [] },
  ];

  matching(method: string, path: string) {
    return this.requests.filter((request) => request.method === method && request.path === path);
  }

  async signedIn(page: Page, user: User = users.diner) {
    this.user = structuredClone(user);
    await page.addInitScript(() => localStorage.setItem('token', 'test-token'));
  }

  async install(context: BrowserContext) {
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      // Exact origins keep an accidentally changed backend from being silently mocked.
      const service = url.origin === 'http://localhost:3000';
      const factory = url.origin === 'https://pizza-factory.cs329.click';
      if (!(service || factory) || !url.pathname.startsWith('/api/')) {
        await route.fallback();
        return;
      }
      const method = request.method();
      const path = url.pathname;
      const body = request.postData() ? request.postDataJSON() : null;
      this.requests.push({ method, path, query: Object.fromEntries(url.searchParams), body, authorization: request.headers()['authorization'] });
      const reply = (json: any, status = 200) => route.fulfill({ status, json });
      const error = (message: string, status = 400) => reply({ message }, status);

      if (factory) {
        if (path === '/api/order/verify' && method === 'POST') {
          if (this.verificationNetworkError) return route.abort('failed');
          if (this.verificationError) return error('Invalid signature');
          return reply({ message: 'valid', payload: { orderId: '23' } });
        }
        if (path === '/api/docs' && method === 'GET') return reply(this.docs('factory'));
        return route.fallback();
      }
      if (path === '/api/auth') {
        if (method === 'PUT') {
          const user = this.accounts.find((user) => user.email === body.email && user.password === body.password);
          if (!user) return error('Unauthorized', 401);
          this.user = structuredClone(user);
          return reply({ user: this.user, token: 'test-token' });
        }
        if (method === 'POST') {
          if (this.registrationError) return error('Email already registered', 409);
          this.accounts.push({ id: String(this.nextUserId++), name: body.name, email: body.email, password: body.password, roles: [{ role: Role.Diner }] });
          const { password, ...registeredUser } = this.accounts[this.accounts.length - 1];
          this.user = structuredClone(registeredUser);
          return reply({ user: this.user, token: 'test-token' });
        }
        if (method === 'DELETE') { this.user = null; return reply({}); }
      }
      if (path === '/api/user/me' && method === 'GET') {
        return this.sessionExpired || !this.user ? error('Session expired', 401) : reply(this.user);
      }
      if (path === '/api/user' && method === 'GET') {
        if (this.sessionExpired || !this.user || request.headers()['authorization'] !== 'Bearer test-token') return error('Unauthorized', 401);
        if (!Role.isRole(this.user, Role.Admin)) return error('Forbidden', 403);
        const pattern = url.searchParams.get('name') || '*';
        const escaped = pattern.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
        const filtered = this.accounts.filter((account) => new RegExp(`^${escaped}$`, 'i').test(account.name || ''));
        const limit = Number(url.searchParams.get('limit') || 10);
        const start = Number(url.searchParams.get('page') || 0) * limit;
        return reply({ users: filtered.slice(start, start + limit).map(({ password, ...user }) => user), more: start + limit < filtered.length });
      }
      const userDelete = path.match(/^\/api\/user\/([^/]+)$/);
      if (userDelete && method === 'DELETE') {
        if (this.sessionExpired || !this.user || request.headers()['authorization'] !== 'Bearer test-token') return error('Unauthorized', 401);
        if (!Role.isRole(this.user, Role.Admin)) return error('Forbidden', 403);
        if (this.deletionError) return error('Unable to delete user', 500);
        if (!this.accounts.some((account) => account.id === userDelete[1])) return error('User not found', 404);
        this.accounts = this.accounts.filter((account) => account.id !== userDelete[1]);
        if (this.user.id === userDelete[1]) this.user = null;
        return reply({});
      }
      const userUpdate = path.match(/^\/api\/user\/([^/]+)$/);
      if (userUpdate && method === 'PUT') {
        if (this.sessionExpired || !this.user) return error('Session expired', 401);
        const account = this.accounts.find((user) => user.id === userUpdate[1]);
        if (!account) return error('User not found', 404);
        account.name = body.name;
        account.email = body.email;
        account.roles = structuredClone(body.roles);
        if (body.password !== undefined) account.password = body.password;
        const updatedUser = { id: account.id, name: account.name, email: account.email, roles: structuredClone(account.roles) };
        this.user = structuredClone(updatedUser);
        return reply({ user: updatedUser, token: 'test-token' });
      }
      if (path === '/api/order/menu' && method === 'GET') return reply(menu);
      if (path === '/api/order') {
        if (method === 'GET') return reply({ id: '1', dinerId: this.user?.id, orders: this.orders });
        if (method === 'POST') {
          if (this.paymentError) return error('Payment declined', 402);
          const order: Order = { ...body, id: '23', date: '2026-10-03' };
          this.orders.push(order);
          return reply({ order, jwt: 'test-pizza-jwt' });
        }
      }
      if (path === '/api/franchise') {
        if (method === 'GET') {
          const name = (url.searchParams.get('name') || '*').replaceAll('*', '').toLowerCase();
          const filtered = this.franchises.filter((f) => f.name.toLowerCase().includes(name));
          const limit = Number(url.searchParams.get('limit') || 10);
          const start = Number(url.searchParams.get('page') || 0) * limit;
          return reply({ franchises: filtered.slice(start, start + limit), more: start + limit < filtered.length });
        }
        if (method === 'POST') {
          const franchise = { ...body, id: '10' };
          this.franchises.push(franchise);
          return reply(franchise);
        }
      }
      const owner = path.match(/^\/api\/franchise\/([^/]+)$/);
      if (owner) {
        if (method === 'GET') return reply(this.user?.roles?.some((r) => r.role === Role.Franchisee) ? [this.franchises[0]] : []);
        if (method === 'DELETE') { this.franchises = this.franchises.filter((f) => f.id !== owner[1]); return reply({}); }
      }
      const store = path.match(/^\/api\/franchise\/([^/]+)\/store(?:\/([^/]+))?$/);
      if (store) {
        const franchise = this.franchises.find((f) => f.id === store[1])!;
        if (method === 'POST' && !store[2]) {
          const created = { ...body, id: '20', totalRevenue: 0 };
          franchise.stores.push(created);
          return reply(created);
        }
        if (method === 'DELETE' && store[2]) { franchise.stores = franchise.stores.filter((s) => s.id !== store[2]); return reply(null); }
      }
      if (path === '/api/docs' && method === 'GET') return reply(this.docs('service'));
      await route.fallback();
    });
  }

  private docs(source: string) {
    const endpoints = [{
      requiresAuth: true,
      method: 'POST',
      path: '/api/order',
      description: `${source} order endpoint`,
      example: 'Example pizza request',
      response: { accepted: true },
    }];
    if (source === 'service') {
      return { endpoints: [...endpoints, {
        method: 'GET',
        path: '/api/user?page=0&limit=10&name=*',
        requiresAuth: true,
        description: 'Gets a list of users (admin only). Defaults: page=0, limit=10, name=*. Use * as a name wildcard.',
        example: `curl -X GET localhost:3000/api/user -H 'Authorization: Bearer tttttt'`,
        response: {
          users: [{ id: 1, name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' }] }],
          more: false,
        },
      }, {
        method: 'DELETE',
        path: '/api/user/:userId',
        requiresAuth: true,
        description: 'Deletes a user and their authentication and roles (admin only)',
        example: `curl -X DELETE localhost:3000/api/user/3 -H 'Authorization: Bearer tttttt'`,
        response: {},
      }] };
    }
    return { endpoints };
  }
}
