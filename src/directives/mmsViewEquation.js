'use strict';

angular.module('mms.directives')
.directive('mmsViewEquation', [mmsViewEquation]);

function mmsViewEquation() {

    return {
        restrict: 'E',
        template: '<mms-transclude-doc data-mms-element-id="{{para.source}}"></mms-transclude-doc>',
        scope: {
            para: '<mmsPara'
        }
    };
}