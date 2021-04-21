import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsTranscludeCom', ['Utils', 'ElementService', 'UtilsService', 'ViewService', 'UxService', '$templateCache', '$compile', 'growl', 'MathJax', mmsTranscludeCom]);

/**
 * @ngdoc directive
 * @name mmsDirectives.directive:mmsTranscludeCom
 *
 * @requires mms.ElementService
 * @requires mms.UtilsService
 * @requires mms.ViewService
 * @requires mms.UxService
 * @requires mms.Utils
 * @requires $compile
 * @requires $templateCache
 * @requires growl
 * @requires MathJax
 *
 * @restrict E
 *
 * @description
 * Given an element id, puts in the element's documentation binding, if there's a parent 
 * mmsView directive, will notify parent view of transclusion on init and doc change,
 * and on click. Nested transclusions inside the documentation will also be registered.
 * (This is different from mmsTranscludeDoc because of special styles applied to comments)
 *
 * @param {string} mmsElementId The id of the view
 * @param {string} mmsProjectId The project id for the view
 * @param {string=master} mmsRefId Reference to use, defaults to master
 * @param {string=latest} mmsCommitId Commit ID, default is latest
 */
function mmsTranscludeCom(Utils, ElementService, UtilsService, ViewService, UxService, $templateCache, $compile, growl, MathJax) {

    var template = 'partials/mms-directives/mmsTranscludeDoc.html';
    
    var mmsTranscludeComCtrl = function ($scope) {

        $scope.bbApi = {};
        $scope.buttons = [];
        $scope.buttonsInit = false;

        $scope.bbApi.init = function() {
            if (!$scope.buttonsInit) {
                $scope.buttonsInit = true;
                $scope.bbApi.addButton(UxService.getButtonBarButton("presentation-element-preview", $scope), $scope.buttons);
                $scope.bbApi.addButton(UxService.getButtonBarButton("presentation-element-save", $scope), $scope.buttons);
                $scope.bbApi.addButton(UxService.getButtonBarButton("presentation-element-saveC", $scope), $scope.buttons);
                $scope.bbApi.addButton(UxService.getButtonBarButton("presentation-element-cancel", $scope), $scope.buttons);
                $scope.bbApi.addButton(UxService.getButtonBarButton("presentation-element-delete", $scope), $scope.buttons);
                $scope.bbApi.setPermission("presentation-element-delete", $scope.isDirectChildOfPresentationElement, $scope.buttons);
            }     
        };
    };

    var mmsTranscludeComLink = function(scope, domElement : angular.IAugmentedJQuery, attrs, controllers) {
        var mmsViewCtrl = controllers[0];
        var mmsViewPresentationElemCtrl = controllers[1];
        scope.recompileScope = null;
        scope.cfType = 'doc';

        domElement.on("click",function(e) {
            if (scope.startEdit && !scope.nonEditable)
                scope.startEdit();

            if (mmsViewCtrl)
                mmsViewCtrl.transcludeClicked(scope.element);
            if (scope.nonEditable && mmsViewCtrl && mmsViewCtrl.isEditable()) {
                growl.warning("Comment is not editable.");
            }
            e.stopPropagation();
        });

        var recompile = function(preview?) {
            if (scope.recompileScope) {
                scope.recompileScope.$destroy();
            }
            scope.isEditing = false;
            domElement.empty();
            var doc = (preview ? scope.edit.documentation : scope.element.documentation) || '(No comment)';
            doc += ' - <span class="mms-commenter"> Comment by <b>' + scope.element._creator + '</b></span>';
            if (preview) {
                domElement[0].innerHTML = '<div class="panel panel-info">'+doc+'</div>';
            } else {
                domElement[0].innerHTML = doc;
            }
            if (MathJax && !scope.mmsGenerateForDiff) {
                MathJax.Hub.Queue(["Typeset", MathJax.Hub, domElement[0]]);
            }
            scope.recompileScope = scope.$new();
            $compile(domElement.contents())(scope.recompileScope); 
            if (mmsViewCtrl) {
                mmsViewCtrl.elementTranscluded(scope.element, 'Comment');
            }
        };

        var idwatch = scope.$watch('mmsElementId', function(newVal, oldVal) {
            if (!newVal || !scope.mmsProjectId) {
                return;
            }
            idwatch();
            if (UtilsService.hasCircularReference(scope, scope.mmsElementId, 'doc')) {
                domElement.html('<span class="mms-error">Circular Reference!</span>');
                return;
            }
            scope.projectId = scope.mmsProjectId;
            scope.refId = scope.mmsRefId ? scope.mmsRefId : 'master';
            scope.commitId = scope.mmsCommitId ? scope.mmsCommitId : 'latest';
            var reqOb = {elementId: scope.mmsElementId, projectId: scope.projectId, refId: scope.refId, commitId: scope.commitId, includeRecentVersionElement: true};
            ElementService.getElement(reqOb, 1, false)
            .then(function(data) {
                scope.element = data;
                recompile();
                scope.panelType = "Comment";
                if (scope.commitId === 'latest') {
                    scope.$on('element.updated', function (event, elementOb, continueEdit) {
                        if (elementOb.id === scope.element.id && elementOb._projectId === scope.element._projectId &&
                            elementOb._refId === scope.element._refId && !continueEdit) {
                            recompile();
                        }
                    });
                }
            }, function(reason) {
                domElement.html('<span mms-annotation mms-req-ob="::reqOb" mms-recent-element="::recentElement" mms-type="::type" mms-cf-label="::cfLabel"></span>');
                $compile(domElement.contents())(Object.assign(scope.$new(), {
                    reqOb: reqOb,
                    recentElement: reason.data.recentVersionOfElement,
                    type: ViewService.AnnotationType.mmsTranscludeCom,
                    cfLabel: scope.mmsCfLabel
                }));
            });
        });

        if (mmsViewCtrl) {

            scope.isEditing = false;
            scope.elementSaving = false;
            scope.view = mmsViewCtrl.getView();
            scope.isDirectChildOfPresentationElement = Utils.isDirectChildOfPresentationElementFunc(domElement, mmsViewCtrl);

            scope.save = function() {
                Utils.saveAction(scope, domElement, false);
            };

            scope.saveC = function() {
                Utils.saveAction(scope, domElement, true);
            };

            scope.cancel = function() {
                Utils.cancelAction(scope, recompile, domElement);
            };

            scope.startEdit = function() {
                Utils.startEdit(scope, mmsViewCtrl, domElement, template, false);
            };

            scope.preview = function() {
                Utils.previewAction(scope, recompile, domElement);
            };
        } 

        if (mmsViewPresentationElemCtrl) {

            scope.delete = function() {
                Utils.deleteAction(scope,scope.bbApi,mmsViewPresentationElemCtrl.getParentSection());
            };

            scope.instanceSpec = mmsViewPresentationElemCtrl.getInstanceSpec();
            scope.instanceVal = mmsViewPresentationElemCtrl.getInstanceVal();
            scope.presentationElem = mmsViewPresentationElemCtrl.getPresentationElement();
            var auto = [ViewService.TYPE_TO_CLASSIFIER_ID.Image, ViewService.TYPE_TO_CLASSIFIER_ID.Paragraph,
                ViewService.TYPE_TO_CLASSIFIER_ID.List, ViewService.TYPE_TO_CLASSIFIER_ID.Table];

            if (auto.indexOf(scope.instanceSpec.classifierIds[0]) >= 0)
            //do not allow model generated to be deleted
                scope.isDirectChildOfPresentationElement = false;
            if (scope.isDirectChildOfPresentationElement)
                scope.panelTitle = scope.instanceSpec.name;
            scope.panelType = 'Comment';
        }
    };

    return {
        restrict: 'E',
        scope: {
            mmsElementId: '@',
            mmsProjectId: '@',
            mmsRefId: '@',
            mmsCommitId: '@',
            nonEditable: '<',
            mmsCfLabel: '@',
            mmsGenerateForDiff: '<'
        },
        require: ['?^mmsView', '?^mmsViewPresentationElem'],
        controller: ['$scope', mmsTranscludeComCtrl],
        link: mmsTranscludeComLink
    };
}
