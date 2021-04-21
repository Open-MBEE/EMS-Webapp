# angular-mms

## Usage
https://github.com/Open-MBEE/ve/blob/develop/Documents/ViewEditorUserGuide.pdf

## File Structure
* /package.json - Manifest file specifying node module dependencies required to build and bundle the app
* /app/bower.json - Manifest file specifying bower dependencies (js/css library dependencies)
* /Gruntfile.js - build file
* /src/services - services for the mms module, these mostly wrap the rest services of the EMS
* /src/directives - common components for mms.directives module, these provide common ui and behavior
* /src/directives/templates - html templates for our directives plus common styling
* /app - MDEV developed application, this will be separated out in the future


## Installation and Building

1. Install the latest stable version of Node ( at the time of this writing 8.9.4 )
2. To install grunt cli:

       npm install -g grunt-cli
       
3. cd into angular-mms directory
4. to install all node module dependencies specified in package.json

       npm install
       
5. Create a file named `angular-mms-grunt-servers.json`. This is where you will add server mappings.
    * The _grunt_ command will build with these default and fake values, but will not be runnable.  
    * You should update "ems" key to point to the value of the **actual** hostname serving the Model Management Server (MMS).
```json
{
  "ems": "hostnameurl"
}
```

6. In the angular-mms directory, run. . .
* . . .to build and bundle the app in development mode. The final artifact will be available in the dist folder:
  
      grunt

* . . .to build and bundle the app in production mode. The final artifact will be available in the dist folder:
  
      grunt release-build
      
* . . .to build and bundle the app in development mode. This will also launch a web server at localhost:9000 for serving static resources from dist folder and a proxy server for any other resources with path starting with /alfresco. This allows us to test with real service endpoints defined in `angular-mms-grunt-servers.json`. The default server is opencaeuat:

      grunt server
      
* . . .to build a proxied service.  "hostnameurl" is the key from the angular-mms-grunt-servers.json. Its value is the server's base url that you would like the proxy to forward requests to:

      grunt server:hostnameurl
      
* . . .to build and bundle the app in production mode as well as launching a web server locally and a proxy:

      grunt release
      
* . . .to builid and bundle the app in production mode as well as launching a webserver locally and a psroxy, where the server url pertains to a different url you want. Make sure that "hostnameurl" exists in the angular-mms-grunt-servers.json:

      grunt release:hostnameurl
      
* . . .to build and bundle the app in production modes, generate documentation and publish the final artifact to Artifactory:

      grunt deploy
      
* . . .to run unit tests:

      grunt test
      
7. To deploy, zip up the dist folder, it can be served as static files from a web server. For convenience, can unzip it to where mms is hosted (ex. {tomcatDir}/webapps/ve, {mmshost}/ve/mms.html to access)

For more information, please consult the Gruntfile.js and the links at the bottom.

## Building and Running with Docker
To build the container, run the following command: `docker build -t ve .`.
To run the container, run `docker run -it -p 80:9000 --name ve ve`.

## Problems?
If you see some error after updating, try cleaning out the bower_components and bower_components_target folders under /app and do a _grunt clean_

### SASS Won't load
If you get `Loading "sass.js" tasks...ERROR`

Perform the following steps to resolve:
1. cd to the project directory
2. `npm update && npm install`
3. Then `node ./node_modules/node-sass/scripts/install.js`
4. Finally `npm rebuild node-sass`
5. Execute Grunt

### Rendering problems - clear bower cache
If you're sure everything is right, try running _bower cache clean_

## Note on debugging
VE has source-mapping enabled. When developing and debugging it using Chrome, make sure to disable caching in the
Chrome's developer tool network tab to ensure that the source-mapping is updated when constantly modifying codes. ( Chrome caches source-mapping file by default ).
Firefox by default doesn't do that, so if you don't want to disable caching, use Firefox.

## Testing
Run:
        npm install -g protractor
        webdriver-manager update
        
To execute Karma tests manually use

        ./node_modules/karma/bin/karma start config/develop/karma.develop.conf.js

To avoid typing ./node_modules/karma/bin/karma everytime, install karma-cli globally, then karma should automatically use local karma

        npm install -g karma-cli
        karma start config/develop/karma.develop.conf.js
        
To execute Protractor tests

        protractor config/develop/protractor.develop.conf.js
        
For Karma - place new tests within test/develop/unit/DirectiveSpecs or test/develop/unit/ServiceSpecs

For Protractor - place new tests within test/develop/e2e

## Generating Docs
* _grunt ngdocs_ - this would generate html docs based on code comments written in ngdocs style into docs/. The generated files need to be served through a webserver to work.
* _grunt docs_ - this would generate the docs and run the server at localhost:10000

## Contributing and Experimenting, Add Components
For general contributing guidelines, please see <https://www.openmbee.org/contribute.html>

Fork this repo, switch to the develop branch and use our existing build process and structure to add in services/directives/apps - in the future will have a better repo structure for pulling in dependencies and module management

### Services
These are singletons. Angular will use dependency injection to give you whatever dependency you need if you declare them (these can be any built in Angular service or our other custom services in mms module)

Put services under /src/services. For example, to add a service to do graph analysis:

        /src/services/GraphAnalysis.js
        
        'use strict';
        
        angular.module('mms')
        .factory('GraphAnalysis', ['dependentService', GraphAnalysis]);
        /* GraphAnalysis is the name of this service, dependentService is the name of the          service depended upon (there can be more than one comma separated strings for           dependencies), the last argument is the actual service function
        */
        
        function GraphAnalysis(dependentService) {
            var privateVarState = "probably shouldn't do this";
            
            var detectCycles = function(graph) { //whatever graph format in js
                //logic
            };
            
            var privateFunc = function(stuff) {
                //logic
            };
            
            return { //this is like exposing a public method
                detectCycles: detectCycles
            };
        }

### Directives
Put core [Directives](https://docs.angularjs.org/guide/directive "Angular Documentation about Directives") under /src/directives. These should all be prefixed with 'mms' in file names, and will be utilized as 'mms-' in html. For example, this takes an element id argument and just displays the name.

        /src/directives/mmsElementName.js
        
        'use strict';
        
        angular.module('mmsDirectives')
        .directive('mmsElementName', ['ElementService', mmsElementName]);
        
        function mmsElementName(ElementService) {
            var mmsElementNameLink = function(scope, element, attrs) {
                ElementService.getElement(scope.mmsId)
                .then(function(data) {
                    scope.element = data;
                });
            };
            
            return {
                restrict: 'E',
                template: '{{element.name}}',
                scope: {
                    mmsId: '@'
                },
                link: mmsElementNameLink
            };
        }
        
To use this on an html page, use
        
        <mms-element-name data-mms-id="someid"></mms-element-name>

For a more complex template, put your template html in /src/directives/templates and they will be picked up in the compile process, and put into the $templateCache as 'mms/templates/template.html' (see other mms directives for examples or consult the angular docs)
        
There are many more directive options to make complex directives, consult the Angular docs or other mms directives for examples.

If you want to be able to type this into the view editor as the documentation of some element, you'll need to tell the tinymce editor to allow this custom tag. _Go to /src/directives/mmsTinymce.js and add your custom tag to the tinymce option custom_elements_.
        
### App pages
Put test pages under /app. The current build will look through bower dependencies and inject them into you page if you put in special tags. Example:
#### html

        /app/test.html
        
        <!doctype html>
        <html lang="en" ng-app="myApp">
        <head>
            <!-- bower:css -->
            <!-- endbower -->
        </head>
        <body>
            <mms-element-name data-mms-id="someid"></mms-element-name>
            
            <script src="ib/modernizr/modernizr.custom.61017.min.js"></script>
            <!-- bower:js -->
            <!-- endbower -->
            <script src="mms.js"></script>
            <script src="mms.directives.tpls.js"></script>
            <script src="mms.directives.js"></script>
            
            <script src="js/test/app.js"></script>
        </body>
        </html>
        
#### js
        /app/js/test/app.js
        
        'use strict';
        
        angular.module('myApp', ['mms', 'mms.directives']);
        //declare module dependencies

### customize pdf css
see src/services/UtilsService.getPrintCss
[princexml](https://www.princexml.com/)

## Links
* [node.js](http://nodejs.org/)
* [angular](https://docs.angularjs.org/guide/directive)
* [grunt](http://gruntjs.com/)
* [sass](http://sass-lang.com/)
* [ngdocs](https://github.com/idanush/ngdocs/wiki/API-Docs-Syntax)
* [grunt-ngdocs](https://github.com/m7r/grunt-ngdocs)
* [jasmine](http://jasmine.github.io/)

## Rationale for using Karma for testing
* [karma](http://karma-runner.github.io/0.12/index.html)
* [thesis](https://github.com/karma-runner/karma/raw/master/thesis.pdf)
