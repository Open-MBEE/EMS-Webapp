import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsTranscludeName', ['ElementService', 'UxService', '$compile', 'growl', '$templateCache', 'Utils', 'ViewService', mmsTranscludeName]);

/**
 * @ngdoc directive
 * @name mmsDirectives.directive:mmsTranscludeName
 *
 * @requires mms.ElementService
 * @requires mms.UxService
 * @requires mms.Utils
 * @requires $compile
 * @requires $templateCache
 * @requires growl
 *
 * @restrict E
 *
 * @description
 * Given an element id, puts in the element's name binding, if there's a parent 
 * mmsView directive, will notify parent view of transclusion on init and name change,
 * and on click
 *
 * @param {string} mmsElementId The id of the view
 * @param {string} mmsProjectId The project id for the view
 * @param {string=master} mmsRefId Reference to use, defaults to master
 * @param {string=latest} mmsCommitId Commit ID, default is latest
 * @param {bool} mmsWatchId set to true to not destroy element ID watcher
 * @param {boolean=false} nonEditable can edit inline or not
 */
function mmsTranscludeName(ElementService, UxService, $compile, growl, $templateCache, Utils, ViewService) {

    var template = 'partials/mms-directives/mmsTranscludeName.html';
    var defaultTemplate = '<span ng-if="element.name">{{element.name}}</span><span ng-if="!element.name" class="no-print placeholder">(no name)</span>';
    var editTemplate = '<span ng-if="edit.name">{{edit.name}}</span><span ng-if="!edit.name" class="no-print placeholder">(no name)</span>';

    var mmsTranscludeNameLink = function(scope, domElement : angular.IAugmentedJQuery, attrs, controllers) {
        var mmsViewCtrl = controllers[0];
        scope.recompileScope = null;
        domElement.on("click",function(e) {
            if (scope.noClick)
                return;

            if (scope.clickHandler) {
                scope.clickHandler();
                return;
            }
            if (scope.startEdit && !scope.nonEditable)
                scope.startEdit();

            if (!mmsViewCtrl)
                return false;

            if (scope.nonEditable && mmsViewCtrl && mmsViewCtrl.isEditable()) {
                growl.warning("Cross Reference is not editable.");
            }
            mmsViewCtrl.transcludeClicked(scope.element);
            e.stopPropagation();
        });

        var recompile = function(preview?) {
            if (scope.recompileScope) {
                scope.recompileScope.$destroy();
            }
            domElement.empty();
            if (preview) {
                domElement[0].innerHTML = '<div class="panel panel-info">'+editTemplate+'</div>';
            } else {
                scope.isEditing = false;
                domElement[0].innerHTML = defaultTemplate;
            }
            scope.recompileScope = scope.$new();
            $compile(domElement.contents())(scope.recompileScope);
            if (mmsViewCtrl) {
                mmsViewCtrl.elementTranscluded(scope.element);
            }
        };

        var idwatch = scope.$watch('mmsElementId', function(newVal, oldVal) {
            if (!newVal || !scope.mmsProjectId) {
                return;
            }
            if (!scope.mmsWatchId) {
                idwatch();
            }
            scope.projectId = scope.mmsProjectId;
            scope.refId = scope.mmsRefId ? scope.mmsRefId : 'master';
            scope.commitId = scope.mmsCommitId ? scope.mmsCommitId : 'latest';

            domElement.html('(loading...)');
            domElement.addClass("isLoading");
            var reqOb = {elementId: scope.mmsElementId, projectId: scope.projectId, refId: scope.refId, commitId: scope.commitId, includeRecentVersionElement: true};
            ElementService.getElement(reqOb, 1, false)
            .then(function(data) {
                scope.element = data;
                recompile();
                Utils.reopenUnsavedElts(scope, "name");
                if (mmsViewCtrl) {
                    mmsViewCtrl.elementTranscluded(scope.element);
                }
                if (scope.commitId === 'latest') {
                    scope.$on('element.updated', function (event, elementOb, continueEdit, stompUpdate) {
                        if (elementOb.id === scope.element.id && elementOb._projectId === scope.element._projectId &&
                            elementOb._refId === scope.element._refId && !continueEdit) {
                            //actions for stomp
                            if (stompUpdate && scope.isEditing === true) {
                                growl.warning("This value has been changed: " + elementOb.name +
                                    " modified by: " + elementOb._modifier, {ttl: -1});
                            } else {
                                recompile();
                            }
                        }
                    });
                }
            }, function(reason) {
                domElement.html('<span mms-annotation mms-req-ob="::reqOb" mms-recent-element="::recentElement" mms-type="::type" mms-cf-label="::cfLabel"></span>');
                $compile(domElement.contents())(Object.assign(scope.$new(), {
                    reqOb: reqOb,
                    recentElement: reason.data.recentVersionOfElement,
                    type: ViewService.AnnotationType.mmsTranscludeName,
                    cfLabel: scope.mmsCfLabel
                }));
            }).finally(function() {
                domElement.removeClass("isLoading");
            });
        });



        if (mmsViewCtrl) {

            scope.isEditing = false;
            scope.elementSaving = false;
            scope.view = mmsViewCtrl.getView();

            scope.save = function(e) {
                e.stopPropagation();
                Utils.saveAction(scope, domElement, false);
            };

            scope.cancel = function(e) {
                e.stopPropagation();
                Utils.cancelAction(scope, recompile, domElement);
            };

            scope.startEdit = function() {
                Utils.startEdit(scope, mmsViewCtrl, domElement, template, false);
            };

        }
    };

    return {
        restrict: 'E',
        scope: {
            mmsElementId: '@',
            mmsProjectId: '@',
            mmsRefId: '@',
            mmsCommitId: '@',
            mmsWatchId: '@',
            noClick: '@',
            nonEditable: '<',
            clickHandler: '&?',
            mmsCfLabel: '@'
        },
        require: ['?^^mmsView'],
        // controller: ['$scope', mmsTranscludeNameCtrl],
        link: mmsTranscludeNameLink
    };
}