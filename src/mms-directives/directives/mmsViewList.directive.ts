import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsViewList', ['$compile', 'UtilsService', 'Utils', mmsViewList]);

function mmsViewList($compile, UtilsService, Utils) {

    return {
        restrict: 'E',
        scope: {
            list: '<mmsList'
        },
        link: function(scope, element, attrs) {
            var html = UtilsService.makeHtmlList(scope.list);
            element[0].innerHTML = html;
            $(element[0]).find('img').each(function(index) {
                Utils.fixImgSrc($(this));
            });
            $compile(element.contents())(scope);
            return;
        }
    };
}