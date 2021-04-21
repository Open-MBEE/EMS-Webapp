import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsViewPlot', ['$compile','$window', mmsViewPlot]);

function mmsViewPlot($compile, $window) {
    var mmsViewLink = function(scope, domElement : angular.IAugmentedJQuery, element, attrs, mmsViewCtrl) {
        if ( scope.plot.type === "Plot") {
            if ( scope.plot.config !== undefined  && scope.plot.config.trim().length !== 0){
                try{
                    scope.plot.config = JSON.parse(scope.plot.config.replace(/'/g, '"'));
                    if( scope.plot.config.ptype !== undefined) {
                        scope.plot.ptype = scope.plot.config.ptype;
                    }
                }
                catch (err){
                   console.log("error ignored"); 
                }
            }
            domElement[0].innerHTML = '<figure><mms-' + scope.plot.ptype + '-plot plot="plot"></mms-' + scope.plot.ptype + '-plot><figcaption>{{plot.title}}</figcaption></figure>';
            $compile(domElement.contents())(scope);
        }
    };
    return {
        restrict: 'E',
        require: '?^mmsView',
        scope: {
            plot: '<mmsPlot'
        },
        link: mmsViewLink
    };
}