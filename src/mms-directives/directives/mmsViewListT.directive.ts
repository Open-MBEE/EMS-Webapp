import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsViewListT', [mmsViewListT]);

function mmsViewListT() {

    return {
        restrict: 'E',
        template: '<mms-cf mms-cf-type="doc" mms-element-id="{{para.source}}"></mms-cf>',
        scope: {
            para: '<mmsPara'
        }
    };
}