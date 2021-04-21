import * as angular from 'angular';

/**
 * @ngdoc overview
 * @name mms
 *
 * @description
 * # mms module
 * This module provides angular services that abstract the mms rest api. The only 
 * dependency it has is the LoDash js library. Most service functions return
 * a Promise that allows you to pass it success and failure handlers via the
 * then() method. The format of the objects that are resolved when successful 
 * are defined by json schemas that're linked to below.
 * 
 * ## Links
 * * [angular.js](http://angularjs.org)
 * * [mms](https://github.com/Open-MBEE/mms)
 * * {@link mms.URLService#methods_handleHttpStatus Promise rejected object}
 * * [lodash](http://lodash.com)
 *
 * ## Example app that uses this module
 * The following example is an app that uses the ElementService from mms to
 * display the name of a particular element.
 *
 * ### HTML (index.html)
 *  <pre>
    <!doctype html>
    <html ng-app="exampleApp">
        <head>
            <title>Example app</title>
        </head>
        <body ng-controller="exampleCtrl">
            <div>{{element.name}}</div> <!-- data binds to the name property
                                            of the element object in $scope -->
        <script src="lodash.js"></script>
        <script src="angular.js"></script>
        <script src="mms.js"></script>
        <script src="app.js"></script>
        </body>
    </html>
    </pre>
 * ### JS (app.js)
 *  <pre>
    angular.module('exampleApp', ['mms'])
    .controller('exampleCtrl', ['$scope', 'ElementService',
        function($scope, ElementService) { //dependency injections
            ElementService.getElement('_element_id').then(
                function(element) { //success handler
                    $scope.element = element;
                }, 
                function(reason) { //failed handler
                    alert('get element failed: ' + reason.message);
                }
            );
        }
    ]);
    </pre>
 */
//declare let window : mmsWindow;

var mms = angular.module('mms', []);

mms.config(['$sceProvider', function($sceProvider) {
    $sceProvider.enabled(false);
}])
.constant('_', window._)
.constant('HtmlRenderedDiff', window.HtmlRenderedDiff)
.constant('moment', window.moment)
.constant('flatpickr', window.flatpickr);
