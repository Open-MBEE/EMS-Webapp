import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsTranscludeDoc', ['Utils','ElementService', 'UtilsService', 'ViewService', 'UxService', 'AuthService', '$compile', '$templateCache', 'growl', '_', 'MathJax', mmsTranscludeDoc]);

/**
 * @ngdoc directive
 * @name mmsDirectives.directive:mmsTranscludeDoc
 *
 * @requires mms.ElementService
 * @requires mms.UtilsService
 * @requires mms.ViewService
 * @requires mms.UxService
 * @requires mms.Utils
 * @requires $compile
 * @requires $templateCache
 * @requires growl
 * @requires _
 * @requires MathJax
 *
 * @restrict E
 *
 * @description
 * Given an element id, puts in the element's documentation binding, if there's a parent 
 * mmsView directive, will notify parent view of transclusion on init and doc change,
 * and on click. Nested transclusions inside the documentation will also be registered.
 * 
 * ## Example
 *  <pre>
    <mms-transclude-doc mms-element-id="element_id"></mms-transclude-doc>
    </pre>
 *
 * @param {string} mmsElementId The id of the view
 * @param {string} mmsProjectId The project id for the view
 * @param {string=master} mmsRefId Reference to use, defaults to master
 * @param {string=latest} mmsCommitId Commit ID, default is latest
 * @param {bool} mmsWatchId set to true to not destroy element ID watcher
 * @param {boolean=false} nonEditable can edit inline or not
 */
function mmsTranscludeDoc(Utils, ElementService, UtilsService, ViewService, UxService, AuthService, $compile, $templateCache, growl, _, MathJax) {

    var template = 'partials/mms-directives/mmsTranscludeDoc.html';

    var fixPreSpanRegex = /<\/span>\s*<mms-cf/g;
    var fixPostSpanRegex = /<\/mms-cf>\s*<span[^>]*>/g;
    var emptyRegex = /^\s*$/;
    var spacePeriod = />(?:\s|&nbsp;)\./g;
    var spaceSpace = />(?:\s|&nbsp;)(?:\s|&nbsp;)/g;
    var spaceComma = />(?:\s|&nbsp;),/g;

    var mmsTranscludeDocCtrl = function($scope) {

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

    var mmsTranscludeDocLink = function(scope, domElement : angular.IAugmentedJQuery, attrs, controllers) {
        var mmsViewCtrl = controllers[0];
        var mmsViewPresentationElemCtrl = controllers[1];
        scope.recompileScope = null;
        scope.cfType = 'doc';
        scope.editorApi = {};
        domElement.on("click",function(e) {
            if (scope.startEdit && !scope.nonEditable)
                scope.startEdit();

            if (mmsViewCtrl)
                mmsViewCtrl.transcludeClicked(scope.element);
            if (scope.nonEditable && mmsViewCtrl && mmsViewCtrl.isEditable()) {
                growl.warning("Cross Reference is not editable.");
            }
            e.stopPropagation();
        });

        var recompile = function(preview?) {
            if (scope.recompileScope) {
                scope.recompileScope.$destroy();
            }
            domElement.empty();
            var doc = preview ? scope.edit.documentation : scope.element.documentation;
            if (!doc || emptyRegex.test(doc)) {
                doc = '<p class="no-print placeholder">(no ' + scope.panelType + ')</p>';
            }
            doc = doc.replace(fixPreSpanRegex, "<mms-cf");
            doc = doc.replace(fixPostSpanRegex, "</mms-cf>");
            doc = doc.replace(spacePeriod, '>.');
            doc = doc.replace(spaceSpace, '> ');
            doc = doc.replace(spaceComma, '>,');
            if (preview) {
                domElement[0].innerHTML = '<div class="panel panel-info">'+doc+'</div>';
            } else {
                scope.isEditing = false;
                domElement[0].innerHTML = doc;
            }
            $(domElement[0]).find('img').each(function(index) {
                Utils.fixImgSrc($(this));
            });
            if (mmsViewPresentationElemCtrl) {
                var peSpec = mmsViewPresentationElemCtrl.getPresentationElement();
                var pe = mmsViewPresentationElemCtrl.getInstanceSpec();
                if (pe && pe._veNumber && peSpec && (peSpec.type === 'TableT' || peSpec.type === 'Figure' || peSpec.type === 'Equation' || peSpec.type === 'ImageT')) {
                    var type = (peSpec.type === 'TableT') ? 'table' : peSpec.type.toLowerCase();
                    if (type === 'imaget') {
                        type = 'figure';
                    }
                    UtilsService.addLiveNumbering(pe, $('#' + pe.id), type);
                }
            }
            if (MathJax && !scope.mmsGenerateForDiff) {
                MathJax.Hub.Queue(["Typeset", MathJax.Hub, domElement[0]]);
            }
            scope.recompileScope = scope.$new();
            $compile(domElement.contents())(scope.recompileScope);
            if (mmsViewCtrl) {
                mmsViewCtrl.elementTranscluded(scope.element);
            }
        };

        var idwatch = scope.$watch('mmsElementId', function(newVal) {
            if (!newVal || !scope.mmsProjectId) {
                return;
            }
            if (!scope.mmsWatchId) {
                idwatch();
            }
            if (UtilsService.hasCircularReference(scope, scope.mmsElementId, 'doc')) {
                domElement.html('<span class="mms-error">Circular Reference!</span>');
                return;
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
                if (!scope.panelTitle) {
                    scope.panelTitle = scope.element.name + " Documentation";
                    scope.panelType = "Text";
                }
                recompile();
                Utils.reopenUnsavedElts(scope, "documentation");

                if (scope.commitId === 'latest') {
                    scope.$on('element.updated', function (event, elementOb, continueEdit, stompUpdate) {
                        if (elementOb.id === scope.element.id && elementOb._projectId === scope.element._projectId &&
                            elementOb._refId === scope.element._refId && !continueEdit) {
                            //actions for stomp
                            if(stompUpdate && scope.isEditing === true) {
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
                    type: ViewService.AnnotationType.mmsTranscludeDoc,
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
            //TODO remove this when deleting in parent PE directive
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
                Utils.deleteAction(scope, scope.bbApi, mmsViewPresentationElemCtrl.getParentSection());
            };

            scope.instanceSpec = mmsViewPresentationElemCtrl.getInstanceSpec();
            scope.instanceVal = mmsViewPresentationElemCtrl.getInstanceVal();
            scope.presentationElem = mmsViewPresentationElemCtrl.getPresentationElement();
            var auto = [ViewService.TYPE_TO_CLASSIFIER_ID.Image, ViewService.TYPE_TO_CLASSIFIER_ID.Paragraph,
                ViewService.TYPE_TO_CLASSIFIER_ID.List, ViewService.TYPE_TO_CLASSIFIER_ID.Table];

            if (auto.indexOf(scope.instanceSpec.classifierIds[0]) >= 0)
            //do not allow model generated to be deleted
                scope.isDirectChildOfPresentationElement = false;
            if (scope.isDirectChildOfPresentationElement) {
                scope.panelTitle = scope.instanceSpec.name;
                scope.panelType = scope.presentationElem.type; //this is hack for fake table/list/equation until we get actual editors
                if (scope.panelType.charAt(scope.panelType.length-1) === 'T')
                    scope.panelType = scope.panelType.substring(0, scope.panelType.length-1);
                if (scope.panelType === 'Paragraph')
                    scope.panelType = 'Text';
                if (scope.panelType === 'Figure' || scope.panelType === 'ImageT')
                    scope.panelType = 'Image';
            }
            if (scope.presentationElem) {
                scope.editorType = scope.presentationElem.type;
            }
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
            nonEditable: '<',
            mmsCfLabel: '@',
            mmsGenerateForDiff: '<'
        },
        require: ['?^^mmsView','?^^mmsViewPresentationElem'],
        controller: ['$scope', mmsTranscludeDocCtrl],
        link: mmsTranscludeDocLink
    };
}
