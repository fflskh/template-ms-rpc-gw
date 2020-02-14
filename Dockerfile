FROM 127.0.0.1:9090/baseimage:v1
RUN mkdir -p /user/home/ms-base
WORKDIR /user/home/ms-base/
COPY . /user/home/ms-base

RUN npm config set unsafe-perm true
RUN npm install --production 
RUN npm install -g sequelize-cli

EXPOSE 3000
ENV NODE_ENV tytest
RUN sequelize db:migrate
RUN sequelize db:seed:all
CMD node bin/www
