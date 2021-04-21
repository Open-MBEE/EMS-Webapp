import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsHtmlDiff', ['$templateCache', '$timeout', 'MathJax', 'HtmlRenderedDiff', mmsHtmlDiff]);

function mmsHtmlDiff($templateCache, $timeout, MathJax, HtmlRenderedDiff) {
    var template = 'partials/mms-directives/mmsHtmlDiff.html';
    var htmlDiffIdPrefix = 'htmlDiff-';
    return {
        restrict: 'E',
        scope: {
            mmsBaseHtml: '<',
            mmsComparedHtml: '<',
            mmsDiffFinish: '<'
        },
        templateUrl: template,
        controller: ['$scope', mmsHtmlDiffCtrl],
        link: mmsHtmlDiffLink
    };

    function mmsHtmlDiffCtrl($scope) {
        _performDiff($scope, $scope.mmsBaseHtml, $scope.mmsComparedHtml);
    }

    function mmsHtmlDiffLink(scope, element, attrs) {
        scope.htmlDiffId = htmlDiffIdPrefix + scope.$id;
        scope.$watch('mmsBaseHtml', function(newBaseHtml, oldBaseHtml) {
            if (newBaseHtml !== oldBaseHtml) {
                _performDiff(scope, scope.mmsBaseHtml, scope.mmsComparedHtml);
            }
        });

        scope.$watch('mmsComparedHtml', function(newComparedHtml, oldComparedHtml) {
            if(newComparedHtml !== oldComparedHtml) {
                _performDiff(scope, scope.mmsBaseHtml, scope.mmsComparedHtml);
            }
        });
    }

    function _performDiff(scope, baseHtml, comparedHtml) {
        scope.diffResult = HtmlRenderedDiff.generateDiff(_preformatHtml(baseHtml), _preformatHtml(comparedHtml));
        $timeout(function() {
            var diffContainer = $('#' + scope.htmlDiffId);
            _formatImgDiff(diffContainer);
            _formatRowDiff(diffContainer);
            scope.mmsDiffFinish();
        });
    }

    function _preformatHtml(html) {
        return html.replace(/\r?\n|\r|\t/g, '').replace('<p class="ng-scope">&nbsp;</p>', '');
    }

    function _formatImgDiff(diffContainer) {
        diffContainer
            .find('img')
            .each(function () {
                var img$ = $(this);
                var imgPatcherClass = img$.hasClass('patcher-insert') ? 'patcher-insert' : img$.hasClass('patcher-delete') ? 'patcher-delete' : null;
                if (imgPatcherClass) {
                    img$.wrap('<span class="' + imgPatcherClass + '">');
                }
            });
    }

    function _formatRowDiff(diffContainer) {
        diffContainer
            .find('tr')
            .each(function () {
                var tr$ = $(this);
                var trPatcherClass = tr$.hasClass('patcher-insert') ? 'patcher-insert' : tr$.hasClass('patcher-delete') ? 'patcher-delete' : null;
                if (trPatcherClass) {
                   tr$.removeClass(trPatcherClass);
                   tr$.children().each(function() {
                       $(this).addClass(trPatcherClass);
                   });
                }
            });
    }
}
