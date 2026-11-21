# Curiosity Report: Kubernetes Self-Hosting Full Development Environment

I have an internship with YouGorithm making a website and backend service as an alternative recommendation algorithm for YouTube.
However my boss wants to self-host the website. I want to find a way to have many of the features of AWS and do automation, while following allowing him to choose self hosting.
I heard about it from my cousin, but it was also mentioned in the Docker reading section on MasterLS.
It was my understanding that Kubernetes was a tool that enabled the automated deployment, scaling, and management of containerized applications.

## Overview of Kubernetes

Kubernetes is an open source system for automating deployment, scaling, and management of containerized applications.
In some ways it is a lot like Amazon ECS, except it is open source, and has the option to self host.
There is a steeper learning curve to Kubernetes when compared with Amazon ECS, because unlike ECS, you have to learn to manage and orchestrate all the components. You also need to set up backups, and security yourself in many ways.

However Kubernetes has benefits as well including:

- Self-Hosting: You can run Kubernetes containers anywhere, including your local machines
- Self-Healing: Kubernetes automatically restarts containers that crash, and can replace entire pods when needed. It will reattach storage in response to. wider failures. It can integrate with node autoscalers to self-heal at the node level.
- Horizontal and Vertical scaling: Adjust your application and resources, with setup and with automatic resource requests and limits based on actual usage patterns.
- No need to expose your secrets to any third party: With self hosting you can store and keep your secrets safe, Using a secrets object, and adjust your CI/CD pipeline to just utilize those stored secrets once it is deployed to your cluster. Though you do have to encrypt and apply access control yourself, and keep backups yourself.
- Metrics addons that can be used with Grafana, Grafana even includes a dedicated observability tab for Kubernetes.

## What I did to Research Kubernetes

I looked at the documentation on Kubernetes official site [kubernetes.io](https://kubernetes.io/docs/home/).
I also looked for resources online for Kubernetes, and asked AI for resources and to check my understanding, also to help work through some issues. This is still my own curiosity.

## My First Experiment

My first experiment was with Minikube. This wasn't as straight forward as I thought it would be. It didn't want to run on my MacBook.
Eventually I found something that worked.
The steps I took for this first experiment were:

- Download Docker Desktop [Docker Desktop](https://www.google.com/aclk?sa=L&ai=DChsSEwjY-s6H0JmYAxV9D0QIHb0bARcYACICCAEQABoCZHo&co=1&gclid=CjwKCAiAn4XYBhA-EiwA8176FZbV2DLF-IPdyYyYKMa2lnfPQjujrh6nKuWq-CQzhRP-1naNmLMioRoC-wMQAvD_BwE&cid=CAAS0gHkaJbzQ4YzqAXy4CnUxGBKa5VWQ0rdDCvgAA0focwM7kr_ueOM5dVJmxiDm2jbFluBvOcsP0KFFlc1EqEjJS2fs_4ivDS4uN8aB45B-VDsuuOGgu-y6TLZ6ijtNmTU07xNvdBCq6vYqDqBGHtJLEh5wIZsMVngoAHVYtXrYlzjRscEN8WIzDZJb4FtNnCOOWbvXMxKECmSrFKj6e1qulBr9-08rSkaejROAERIGJBv3IkfNAFSyAG-80fB797PhdkF1MnXt8cAwxM8ys6JnK3pSI4&cce=1&sig=AOD64_3bfd4AAboKHeAB9SCPAqwki0b7Dg&q&adurl&ved=2ahUKEwiRmMqH0JmYAxWYdzIDHSovIJgQ0Qx6BAgPEAE&nis=2&ch=1)
- install minikube with homebrew ```rew install minikube```
- install vfkit with homebrew ```brew install vfkit```
- Start Minikube ```minikube start -p playground --driver=vfkit --network=nat```
- Checked if it worked using the commands ```minikube -p playground status``` and ```minikube -p playground kubectl -- get nodes``` and got the Ready status
- Ran ```minikube -p playground dashboard``` to launch the dashboard

Result: A running Kubernetes Desktop and cluster.

## Second Experiment

For my second experiment I followed the instructions found here: [Hello-Minikube](https://kubernetes.io/docs/tutorials/hello-minikube/)

Though I had to make some modifications. Because I am running a minikube profile, I have to add ```-p playground``` to all my minikube commands.

This actually worked.

## Third Experiment

I wanted to get my front end and backend running on my kubernetes deployment. The next steps assume Deliverable 7 has been completed. I know this isn't a CI pipeline. But for now I want to just do a very basic deployment. Further research would be done to make this a CI pipeline.

I used the command below:

```bash
kubectl create deployment jwt-pizza-service --image=jwt-pizza-service
```

And verified it using the following commands

```bash
kubectl get deployments
kubectl get pods
```

it should show a deployment with the name of your backend running, and a pod with the name of your deployment

This didn't work for me, because I wasn't using a docker driver. What worked instead was this:

```bash
minikube -p playground image load jwt-pizza-service:latest
kubectl patch deployment jwt-pizza-service \
  --type=strategic \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"jwt-pizza-service","imagePullPolicy":"IfNotPresent"}]}}}}'
```

This is because I am using vfkit, rather than simply using docker.

After that I was able to actually verify the pod and deployment was running, and I ran the following command to expose it:

```bash
kubectl expose deployment jwt-pizza-service \
  --name=jwt-pizza-service \
  --port=80 \  
  --target-port=80  
```

you can verify your services using this command 

```bash
kubectl get services
```

Though you will need to port forward it to your system if you want to use it:

```bash
kubectl port-forward service/jwt-pizza-service 8080:80
```

You can test it just as you did in JWT Pizza Service Container

```bash
curl localhost:8080
curl localhost:8080/api/order/menu
```

Mine failed initially because I was using "host.docker.internal" for the host.

To fix this I decided to get MySQL running in Kubernetes.

## Persistent Storage With Kubernetes

I followed the instructions found here: [Deploying WordPress and MySQL with Persistent Volumes](https://kubernetes.io/docs/tutorials/kubernetes-basics/explore/)

Along with instruction from here: [Updating Configuration via a ConfigMap](https://kubernetes.io/docs/tutorials/kubernetes-basics/explore/)

And some helpful advice from OpenAI.

More specifically I did the following:

Check the storage class

```bash
kubectl get storageclass
```

if it is default Kubernetes can automatically provision the storage THE MySQL instance requests.

I created the credentials using this:

```bash
kubectl create secret generic mysql-auth \
  --from-literal=MYSQL_ROOT_PASSWORD="$(openssl rand -hex 24)" \
  --from-literal=MYSQL_PASSWORD="$(openssl rand -hex 24)"
```


This creates secrets contained within your cluster

I then created a file called `mysql.yaml` with the following code:

```yaml

apiVersion: v1
kind: Service
metadata:
  name: mysql
spec:
  clusterIP: None
  selector:
    app: mysql
  ports:
    - port: 3306
      targetPort: 3306
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: mysql
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8.4
          ports:
            - containerPort: 3306
          env:
            - name: MYSQL_DATABASE
              value: pizza
            - name: MYSQL_USER
              value: pizza
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-auth
                  key: MYSQL_ROOT_PASSWORD
            - name: MYSQL_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-auth
                  key: MYSQL_PASSWORD
          volumeMounts:
            - name: mysql-data
              mountPath: /var/lib/mysql
  volumeClaimTemplates:
    - metadata:
        name: mysql-data
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 2Gi
```

applied it using:

```bash
kubectl apply -f mysql.yaml
```

Then I verified it using this:

```bash
kubectl get secrets
kubectl get pvc
kubectl get pods
```
Test mysql using this:

```bash
kubectl exec -it mysql-0 -- sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql -u"$MYSQL_USER" "$MYSQL_DATABASE"'
```

Test database using this:

```sql
SHOW DATABASES;
SELECT VERSION();
```

Updated my connection in the dist/src/config.js file to use:

```yaml
connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 60000,
   },
```

```bash
kubectl edit deployment jwt-pizza-service
```

allows you to edit the deployment and add these environment variables:

```yaml
env:
  - name: DB_HOST
    value: mysql
  - name: DB_PORT
    value: "3306"
  - name: DB_NAME
    value: pizza
  - name: DB_USER
    value: pizza
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: mysql-auth
        key: MYSQL_PASSWORD
```

```bash
kubectl rollout status deployment/jwt-pizza-service
kubectl logs deployment/jwt-pizza-service
```

I then rebuilt my container and pushed it into my minikube:

```bash
docker build -t jwt-pizza-service:v2 .
minikube -p playground image load jwt-pizza-service:v2
kubectl set image deployment/jwt-pizza-service \
  jwt-pizza-service=jwt-pizza-service:v2
```

Verified my deployment:

```bash
kubectl rollout status deployment/jwt-pizza-service
kubectl logs deployment/jwt-pizza-service
```

Tested the connection \(after ensuring that port forwarding was still active\):

```bash
curl localhost:8080
```

Then I ran the following:

```bash
sh generatePizzaData.sh http://localhost:8080 
```

Note you may need to run this first:

```bash
kubectl exec deployment/jwt-pizza-service -- \
  node src/init.js "Admin" "a@jwt.com" "admin"
```

Or drop the database:

```bash
kubectl exec -it mysql-0 -- sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root'
```

and restart your deployment.

```bash
kubectl rollout restart deployment/jwt-pizza-service
```

This is because we create the database to persist in the mysql instance, but that means it never initializes.

Now we can test our Server:

```bash
curl localhost:8080
curl localhost:8080/api/order/menu
```

And it should work as expected.

## Front End Hosting

Next I wanted to learn about front end hosting

I started by creating a dockerfile:

```Dockerfile

# Stage 1: Build the Vite application
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_MODE=kubernetes
RUN npm run build -- --mode "$VITE_MODE"

# Stage 2: Serve using Nginx
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
```

then I configured nginx:
```conf

server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

and created a `.dockerignore` file:

```dockerignore
node_modules
dist
.git
.env.local
.env.*.local
.env.development
```

create a `.env.kubernetes` file:

```env
VITE_PIZZA_SERVICE_URL=
VITE_PIZZA_FACTORY_URL=https://pizza-factory.cs329.click
```

This allows us to use the empty string for the VITE_PIZZA_SERVICE_URL, which will be useful for ingress.

We then build the docker container

```bash
docker build --platform linux/arm64 \
  -t jwt-pizza:v1 .
```

Test it

```bash
docker run --rm -p 8081:80 jwt-pizza:v1
```

visit `http://localhost:8081`

and deploy to minikube

```bash

minikube -p playground image load jwt-pizza:v1

kubectl create deployment jwt-pizza \
  --image=jwt-pizza:v1

kubectl expose deployment jwt-pizza \
  --port=80 \
  --target-port=80
```

And test the deployment

```bash
kubectl get deployments
kubectl get pods
kubectl get services
```

We now have them both running. But we need to connect them. We do this through traefik.

```bash
minikube -p playground addons enable traefik
```

We verify that it is working using this command:

```bash
kubectl get pods -n kube-system \
  -l app.kubernetes.io/name=traefik
```

Now we need to create an `ingress.yaml` file

```yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: jwt-pizza-ingress
spec:
  ingressClassName: traefik
  rules:
    - http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: jwt-pizza-service
                port:
                  number: 80

          - path: /
            pathType: Prefix
            backend:
              service:
                name: jwt-pizza
                port:
                  number: 80
```

and run

```bash
kubectl apply -f ingress.yaml
kubectl get ingress
```

Then you can port forward it:

```bash
kubectl -n kube-system port-forward \
  service/traefik 8080:80
```


and test it with curl

```bash
curl -i http://localhost:8080/api/order/menu
```

Or you could just use

```bash
minikube -p playground ip
```

and visit/use that ip as the URL.

Congratulations, you are now fully locally hosting JWT pizza on your computer through kubernetes. But only over local host

To expose it publicly you can use:

```bash
kubectl -n kube-system port-forward \
  --address 0.0.0.0 \
  service/traefik 8080:80
```

then get your computers IP address and use port 8080.

Or you can use:

```bash
minikube tunnel -p playground
```

This will expose an EXTERNAL-IP for traefik

```bash
kubectl -n kube-system get service traefik
```

This also allows DNS resolution, look at [Minikube Docs](minikube.sigs.k8s.io/docs)

## Scaling

You can scale the clusters, doing so manually like this:

```bash
kubectl scale deployment jwt-pizza-service --replicas=3
```

Or you can use the kubernetes dashboard, and visit replica sets and define the number of replicas there.

You can check on the results here:

```bash
kubectl get pods -l app=jwt-pizza-service -o wide
kubectl get deployment jwt-pizza-service
```

You can apply an auto scaler like this:

```bash
kubectl autoscale deployment jwt-pizza-service \
  --cpu-percent=60 \
  --min=1 \
  --max=5
```

Turn on the metrics-server

```bash
minikube -p playground addons enable metrics-server
```

and observe the auto scaler like so:

```bash
kubectl get hpa --watch
```

It should now automatically load balance now as well.

## What I learned

I learned that Kubernetes isn't that scarry. At least the very basics aren't. It is actually quite easy to work with Kubernetes. While minikube isn't designed for production environments, using `kubectl` means that most of the commands will be the same for the alternatives to minikube.
I think I will be able to set up Project YouGorithm on Kubernetes now that I understand how Kubernetes works, and how to deploy images to Kubernetes.

## Conclusion

If I had to describe what Kubernetes is, I'd explain it is in essence self hosted AmazonECS with the load balancer built in. You set up the containers the way you need them to be, and it will load balance for you. It really is quite simple.
A more appropriate Kubernetes distribution would be [k3d](https://k3d.io) for use with docker and using it to actually have a real production environment.
