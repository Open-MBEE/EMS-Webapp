import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsViewPara', ['$compile', 'UtilsService', 'Utils', mmsViewPara]);

function mmsViewPara($compile, UtilsService, Utils) {

    var mmsViewParaLink = function(scope, element, attrs) {
        var html = UtilsService.makeHtmlPara(scope.para);
        element[0].innerHTML = html;
        $(element[0]).find('img').each(function(index) {
            Utils.fixImgSrc($(this));
        });
        $compile(element.contents())(scope);
        return;
    };

    return {
        restrict: 'E',
        scope: {
            para: '<mmsPara'
        },
        link: mmsViewParaLink
    };
}