import React from 'react';
import View from './view';
import { useNavigate } from 'react-router-dom';
import NotFound from './notFound';
import Button from '../components/button';
import { pizzaService } from '../service/service';
import { Franchise, FranchiseList, Role, Store, User, UserList } from '../service/pizzaService';
import { TrashIcon } from '../icons';

interface Props {
  user: User | null;
}

export default function AdminDashboard(props: Props) {
  const navigate = useNavigate();
  const [franchiseList, setFranchiseList] = React.useState<FranchiseList>({ franchises: [], more: false });
  const [franchisePage, setFranchisePage] = React.useState(0);
  const filterFranchiseRef = React.useRef<HTMLInputElement>(null);

  const [userList, setUserList] = React.useState<UserList>({ users: [], more: false });
  const [userQuery, setUserQuery] = React.useState({ page: 0, name: '*' });
  const [userFilter, setUserFilter] = React.useState('');
  const [pendingDeletion, setPendingDeletion] = React.useState<User | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [userError, setUserError] = React.useState('');
  const deleteDialogRef = React.useRef<HTMLDialogElement>(null);
  const deleteTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const searchRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!Role.isRole(props.user, Role.Admin)) return;
    let active = true;
    setUserError('');
    pizzaService.getUsers(userQuery.page, 10, userQuery.name).then((list) => {
      if (active) setUserList(list);
    }).catch((error) => {
      if (active) setUserError(error.message || 'Unable to load users');
    });
    return () => { active = false; };
  }, [props.user, userQuery]);

  React.useEffect(() => {
    if (pendingDeletion) deleteDialogRef.current?.showModal();
  }, [pendingDeletion]);

  function dismissDeletion() {
    deleteDialogRef.current?.close();
    setPendingDeletion(null);
    if (deleteTriggerRef.current?.isConnected) deleteTriggerRef.current.focus();
    else searchRef.current?.focus();
  }

  async function confirmDeletion() {
    if (!pendingDeletion || deleting) return;
    setDeleting(true);
    setUserError('');
    try {
      await pizzaService.deleteUser(pendingDeletion);
      dismissDeletion();
      const list = await pizzaService.getUsers(userQuery.page, 10, userQuery.name);
      if (!list.users.length && userQuery.page > 0) {
        setUserQuery({ ...userQuery, page: userQuery.page - 1 });
      } else {
        setUserList(list);
      }
    } catch (error: any) {
      setUserError(error.message || 'Unable to delete user');
    } finally {
      setDeleting(false);
    }
  }

  React.useEffect(() => {
    (async () => {
      setFranchiseList(await pizzaService.getFranchises(franchisePage, 3, '*'));
    })();
  }, [props.user, franchisePage]);

  function createFranchise() {
    navigate('/admin-dashboard/create-franchise');
  }

  async function closeFranchise(franchise: Franchise) {
    navigate('/admin-dashboard/close-franchise', { state: { franchise: franchise } });
  }

  async function closeStore(franchise: Franchise, store: Store) {
    navigate('/admin-dashboard/close-store', { state: { franchise: franchise, store: store } });
  }

  async function filterFranchises() {
    setFranchiseList(await pizzaService.getFranchises(franchisePage, 10, `*${filterFranchiseRef.current?.value}*`));
  }

  let response = <NotFound />;
  if (Role.isRole(props.user, Role.Admin)) {
    response = (
      <View title="Mama Ricci's kitchen">
        <div role="region" aria-labelledby="users-heading" className="text-start py-8 px-4 sm:px-6 lg:px-8">
          <h3 id="users-heading" className="text-neutral-100 text-xl">Users</h3>
          {userError && !pendingDeletion && <p role="alert" className="text-orange-400">{userError}</p>}
          <div className="bg-neutral-100 overflow-x-auto my-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="uppercase text-neutral-100 bg-slate-400 border-b-2 border-gray-500">
                <tr>
                  {['Name', 'Email', 'Role', ''].map((header, index) => (
                    <th key={index} scope="col" className="px-6 py-3 text-center text-xs font-medium">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {userList.users.map((user) => (
                  <tr key={user.id}>
                    <td className="text-start px-2 whitespace-nowrap text-l font-mono text-orange-600">{user.name}</td>
                    <td className="text-start px-2 whitespace-nowrap text-sm text-gray-800">{user.email}</td>
                    <td className="text-start px-2 whitespace-nowrap text-sm text-gray-800">{user.roles?.map(({ role }) => role).join(', ')}</td>
                    <td className="px-6 py-1 text-end">
                      <button type="button" className="px-2 py-1 text-sm font-semibold rounded-lg border border-orange-400 text-orange-400 hover:border-orange-800 hover:text-orange-800" onClick={(event) => {
                        deleteTriggerRef.current = event.currentTarget;
                        setUserError('');
                        setPendingDeletion(user);
                      }}>X</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="px-1 py-1">
                    <form onSubmit={(event) => {
                      event.preventDefault();
                      setUserQuery({ page: 0, name: `*${userFilter}*` });
                    }}>
                      <input type="text" aria-label="Name" placeholder="Name" value={userFilter} onChange={(event) => setUserFilter(event.target.value)} className="px-2 py-1 text-sm border border-gray-300 rounded-lg" />
                      <button ref={searchRef} type="submit" className="ml-2 px-2 py-1 text-sm font-semibold rounded-lg border border-orange-400 text-orange-400 hover:border-orange-800 hover:text-orange-800">Search</button>
                    </form>
                  </td>
                  <td colSpan={2} className="text-end text-sm font-medium">
                    <button type="button" className="w-12 p-1 m-1 rounded-lg bg-white hover:bg-orange-200 disabled:bg-neutral-300" disabled={userQuery.page <= 0} onClick={() => setUserQuery({ ...userQuery, page: userQuery.page - 1 })}>Prev</button>
                    <button type="button" className="w-12 p-1 m-1 rounded-lg bg-white hover:bg-orange-200 disabled:bg-neutral-300" disabled={!userList.more} onClick={() => setUserQuery({ ...userQuery, page: userQuery.page + 1 })}>Next</button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <dialog ref={deleteDialogRef} aria-labelledby="delete-user-heading" className="p-6 rounded-lg backdrop:bg-black/50" onCancel={(event) => {
            event.preventDefault();
            if (!deleting) dismissDeletion();
          }}>
            <h3 id="delete-user-heading" className="text-xl">Delete user</h3>
            <p className="my-4">Are you sure you want to delete {pendingDeletion?.name} ({pendingDeletion?.email})?</p>
            {userError && pendingDeletion && <p role="alert" className="text-orange-700">{userError}</p>}
            <button type="button" disabled={deleting} className="px-3 py-1 border rounded-lg mr-2" onClick={dismissDeletion}>Cancel</button>
            <button type="button" disabled={deleting} className="px-3 py-1 border border-orange-400 text-orange-700 rounded-lg" onClick={confirmDeletion}>Delete</button>
          </dialog>
        </div>
        <div role="region" aria-labelledby="franchises-heading" className="text-start py-8 px-4 sm:px-6 lg:px-8">
          <h3 id="franchises-heading" className="text-neutral-100 text-xl">Franchises</h3>
          <div className="bg-neutral-100 overflow-clip my-4">
            <div className="flex flex-col">
              <div className="-m-1.5 overflow-x-auto">
                <div className="p-1.5 min-w-full inline-block align-middle">
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="uppercase text-neutral-100 bg-slate-400 border-b-2 border-gray-500">
                        <tr>
                          {['Franchise', 'Franchisee', 'Store', 'Revenue', 'Action'].map((header) => (
                            <th key={header} scope="col" className="px-6 py-3 text-center text-xs font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      {franchiseList.franchises.map((franchise, findex) => {
                        return (
                          <tbody key={findex} className="divide-y divide-gray-200">
                            <tr className="border-neutral-500 border-t-2">
                              <td className="text-start px-2 whitespace-nowrap text-l font-mono text-orange-600">{franchise.name}</td>
                              <td className="text-start px-2 whitespace-nowrap text-sm font-normal text-gray-800" colSpan={3}>
                                {franchise.admins?.map((o) => o.name).join(', ')}
                              </td>
                              <td className="px-6 py-1 whitespace-nowrap text-end text-sm font-medium">
                                <button type="button" className="px-2 py-1 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-1 border-orange-400 text-orange-400  hover:border-orange-800 hover:text-orange-800" onClick={() => closeFranchise(franchise)}>
                                  <TrashIcon />
                                  Close
                                </button>
                              </td>
                            </tr>

                            {franchise.stores.map((store, sindex) => {
                              return (
                                <tr key={sindex} className="bg-neutral-100">
                                  <td className="text-end px-2 whitespace-nowrap text-sm text-gray-800" colSpan={3}>
                                    {store.name}
                                  </td>
                                  <td className="text-end px-2 whitespace-nowrap text-sm text-gray-800">{store.totalRevenue?.toLocaleString()} ₿</td>
                                  <td className="px-6 py-1 whitespace-nowrap text-end text-sm font-medium">
                                    <button type="button" className="px-2 py-1 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-1 border-orange-400 text-orange-400 hover:border-orange-800 hover:text-orange-800" onClick={() => closeStore(franchise, store)}>
                                      <TrashIcon />
                                      Close
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        );
                      })}
                      <tfoot>
                        <tr>
                          <td className="px-1 py-1">
                            <input type="text" ref={filterFranchiseRef} name="filterFranchise" placeholder="Filter franchises" className="px-2 py-1 text-sm border border-gray-300 rounded-lg" />
                            <button type="submit" className="ml-2 px-2 py-1 text-sm font-semibold rounded-lg border border-orange-400 text-orange-400 hover:border-orange-800 hover:text-orange-800" onClick={filterFranchises}>
                              Submit
                            </button>
                          </td>
                          <td colSpan={4} className="text-end text-sm font-medium">
                            <button className="w-12 p-1 text-sm font-semibold rounded-lg border border-transparent bg-white text-grey border-grey m-1 hover:bg-orange-200 disabled:bg-neutral-300 " onClick={() => setFranchisePage(franchisePage - 1)} disabled={franchisePage <= 0}>
                              «
                            </button>
                            <button className="w-12 p-1 text-sm font-semibold rounded-lg border border-transparent bg-white text-grey border-grey m-1 hover:bg-orange-200 disabled:bg-neutral-300" onClick={() => setFranchisePage(franchisePage + 1)} disabled={!franchiseList.more}>
                              »
                            </button>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <Button className="w-36 text-xs sm:text-sm sm:w-64" title="Add Franchise" onPress={createFranchise} />
        </div>
      </View>
    );
  }

  return response;
}
