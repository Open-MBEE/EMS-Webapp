################################################################################
# Dockerfile
# 
# Enquier
# openmbee@gmail.com
#
# This is the Dockerfile for View Editor (VE). 
# To build the container, run the following command: `docker build -t ve .` 
# To run the container, run `docker run -it -p 80:9000 --name ve ve`
#
################################################################################
FROM node:8

WORKDIR /opt/mbee/ve
COPY . /opt/mbee/ve

# Starts the .bowerrc file
RUN echo "{" > .bowerrc 

############################## START PROXY CONFIG ##############################
# Uncomment this section to configure the proxy for this container.
# Be sure to also uncomment the proxy line in the bower config 
#ENV HTTP_PROXY="http://<YOUR-PROXY-HOST>:<YOUR-PROXY-PORT>"
#ENV HTTPS_PROXY=$HTTP_PROXY
#ENV http_proxy=$HTTP_PROXY 
#ENV https_proxy=$HTTPS_PROXY 
#ENV NO_PROXY=127.0.0.1,localhost
#RUN npm config set proxy $HTTP_PROXY;
#RUN npm config set https-proxy $HTTPS_PROXY; 
#RUN echo "\"https-proxy\": \"${HTTPS_PROXY}\"," >> .bowerrc 
############################### END PROXY CONFIG ###############################

############################### START CA CONFIG ################################
# Uncomment this section to configure a Certificate Authority for this container
#ENV CAFILE_DST <YOUR-CA-FILE-DEST>
#ADD <YOUR-CA-FILE-SRC> $CAFILE_DST
#RUN git config --global http.sslCAInfo $CAFILE_DST;
#RUN npm config set cafile $CAFILE_DST;
#RUN echo "\"ca\": \"${CAFILE_DST}\"" >> .bowerrc
################################ END CA CONFIG #################################

# Ends the .bowerrc file
RUN echo "}" >> .bowerrc

# Configures git to use https:// instead of git:// 
RUN git config --global url."https://".insteadOf git://

# Install dependencies
RUN npm install -g grunt-cli
RUN npm install 
RUN node ./node_modules/node-sass/scripts/install.js
RUN npm rebuild node-sass

# Expose ports
EXPOSE 9000

# When the container runs, we run grunt. The second argument should reference a 
# server defined in the angular-mms-grunt-servers.json file. 
CMD ["grunt", "server:dev"]
