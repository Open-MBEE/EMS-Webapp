'use strict';

angular.module('mms.directives')
.directive('mmsViewReorder', ['ElementService', 'ViewService', 'PermissionsService', '$templateCache', 'growl', '$q', '_', mmsViewReorder]);

/**
 * @ngdoc directive
 * @name mms.directives.directive:mmsViewReorder
 *
 * @requires mms.ViewService
 * @requires $templateCache
 *
 * @restrict E
 *
 * @description
 * Visualize and edit the structure of a view 
 *
 * @param {string} mmsElementId The id of the view
 * @param {string} mmsProjectId The project id for the view
 * @param {string=master} mmsRefId Reference to use, defaults to master
 * @param {string=latest} mmsCommitId Commit ID, default is latest
 */
function mmsViewReorder(ElementService, ViewService, PermissionsService, $templateCache, growl, $q, _) {
    var template = $templateCache.get('mms/templates/mmsViewReorder.html');

    var mmsViewReorderCtrl = function($scope, ViewService) {
        this.getEditing = function() {
            return $scope.editing;
        };
        $scope.treeOptions = {
            accept: function(sourceNodeScope, destNodeScope, destIndex) {
                if (sourceNodeScope.element.isOpaque)
                    return false;
                if (destNodeScope.$element.hasClass('root'))
                    return true;
                if (ViewService.isSection(destNodeScope.element.presentationElement))
                    return true;
                return false;
            }
        };
    };

    var mmsViewReorderLink = function(scope, element, attrs) {
        var ran = false;
        var lastid = null; //race condition if view id changes fast and getting data for old id returns later than last id
        scope.$watch('mmsElementId', function(newVal, oldVal) {
            if (!newVal || newVal == oldVal && ran)
                return;
            ran = true;
            lastid = newVal;
            var commitId = scope.mmsCommitId;
            commitId = commitId ? commitId : 'latest';
            var reqOb = {elementId: scope.mmsElementId, projectId: scope.mmsProjectId, refId: scope.mmsRefId, commitId: commitId};
            ElementService.getElement(reqOb)
            .then(function(data) {
                if (newVal !== lastid)
                    return;
                scope.view = data;
                scope.editable = commitId === 'latest' && PermissionsService.hasProjectIdBranchIdEditPermission(scope.mmsProjectId, scope.mmsRefId);

                var contents = data._contents || data.specification;
                if (contents) {
                    ViewService.getElementReferenceTree(reqOb, contents)
                    .then(function(elementReferenceTree) {
                        if (newVal !== lastid)
                            return;
                        scope.elementReferenceTree = elementReferenceTree;
                        scope.originalElementReferenceTree = _.cloneDeep(elementReferenceTree, function(value, key, object) {
                            if (key === 'instanceId' || key === 'instanceSpecification' || key === 'presentationElement' || key === 'instanceVal')
                                return value;
                            return undefined;
                        });
                    }, function(reason) {
                        if (newVal !== lastid)
                            return;
                        scope.elementReferenceTree = [];
                        scope.originalElementReferenceTree = [];
                    });
                } else {
                    scope.elementReferenceTree = [];
                    scope.originalElementReferenceTree = [];
                }

            }, function(reason) {
                if (newVal !== lastid)
                    return;
                growl.error('View Error: ' + reason.message);
                scope.elementReferenceTree = [];
                scope.originalElementReferenceTree = [];
            });
        });

        scope.editing = false;
        scope.elementReferenceTree = [];
        scope.originalElementReferenceTree = [];

        scope.toggleEditing = function() {
            if (!scope.editable) 
                return false;
            scope.editing = !scope.editing;
            return true;
        };

        scope.save = function() {
            var elementObsToUpdate = [];
            var updateSectionElementOrder = function(elementReference) {
                var sectionEdit = {
                    id: elementReference.instanceId,
                    //_modified: elementReference.instanceSpecification._modified,
                    _projectId: elementReference.instanceSpecification._projectId,
                    _refId: elementReference.instanceSpecification._refId,
                    type: elementReference.instanceSpecification.type,
                    specification: {
                        type: "Expression"
                    }
                };
                //sectionEdit.specialization = _.cloneDeep(elementReference.instanceSpecification.specialization);
                var operand = sectionEdit.specification.operand = [];
                var origOperand = elementReference.instanceSpecification.specification.operand;
                for (var i = 0; i < elementReference.sectionElements.length; i++) {
                    operand.push(elementReference.sectionElements[i].instanceVal);
                    if (elementReference.sectionElements[i].sectionElements.length > 0)
                        updateSectionElementOrder(elementReference.sectionElements[i]);
                }
                if (!angular.equals(operand, origOperand)) {
                    elementObsToUpdate.push(sectionEdit);
                }
            };

            var deferred = $q.defer();
            if (!scope.editable || !scope.editing) {
                deferred.reject({type: 'error', message: "View isn't editable and can't be saved."});
                return deferred.promise;
            }
            if (scope.elementReferenceTree.length === 0) {
                deferred.reject({type: 'error', message: 'View contents were not initialized properly or is empty.'});
                return deferred.promise;
            }
            var viewEdit = {
                id: scope.view.id,
                //_modified: scope.view._modified,
                _projectId: scope.view._projectId,
                _refId: scope.view._refId,
                type: scope.view.type
            };
            //viewEdit.specialization = _.cloneDeep(scope.view.specialization);
            if (scope.view._contents)
                viewEdit._contents = JSON.parse(JSON.stringify(scope.view._contents));
            if (scope.view.specification)
                viewEdit.specification = JSON.parse(JSON.stringify(scope.view.specification));
            var contents = viewEdit._contents || viewEdit.specification;
            var origContents = scope.view._contents || scope.view.specification;
            // Update the View edit object on Save
            if (contents) {
                contents.operand = [];
                for (var i = 0; i < scope.elementReferenceTree.length; i++) {
                    contents.operand.push(scope.elementReferenceTree[i].instanceVal);
                }
            }
            if (viewEdit.view2view)
                delete viewEdit.view2view;
            if (contents && !angular.equals(contents.operand, origContents.operand)) {
                elementObsToUpdate.push(viewEdit);
            }
                // promises.push(ViewService.updateView(viewEdit, scope.mmsRefId));
            for (var j = 0; j < scope.elementReferenceTree.length; j++) {
                if (scope.elementReferenceTree[j].sectionElements.length > 0)
                    updateSectionElementOrder(scope.elementReferenceTree[j]);
            }

            return ElementService.updateElements(elementObsToUpdate, false);
        };

        scope.revert = function() {
            scope.elementReferenceTree = _.cloneDeep(scope.originalElementReferenceTree, function(value, key, object) {
                if (key === 'instanceId' || key === 'instanceSpecification' || key === 'presentationElement' || key === 'instanceVal')
                   return value;
                return undefined;
            });
        };

        scope.refresh = function() {
            var contents = scope.view._contents || scope.view.specification;
            var reqOb = {elementId: scope.mmsElementId, projectId: scope.mmsProjectId, refId: scope.mmsRefId, commitId: scope.mmsCommitId};
            if (contents) {
                ViewService.getElementReferenceTree(reqOb, contents)
                .then(function(elementReferenceTree) {
                    scope.elementReferenceTree = elementReferenceTree;
                    scope.originalElementReferenceTree = _.cloneDeep(elementReferenceTree, function(value, key, object) {
                        if (key === 'instanceId' || key === 'instanceSpecification' || key === 'presentationElement' || key === 'instanceVal')
                            return value;
                        return undefined;
                    });
                }, function(reason) {
                    scope.elementReferenceTree = [];
                    scope.originalElementReferenceTree = [];
                });
            } else {
                scope.elementReferenceTree = [];
                scope.originalElementReferenceTree = [];
            }        
        };

        if (angular.isObject(scope.mmsViewReorderApi)) {
            var api = scope.mmsViewReorderApi;
            api.toggleEditing = scope.toggleEditing;
            api.save = scope.save;
            api.refresh = scope.refresh;
            api.setEditing = function(mode) {
                if (!scope.editable && mode)
                    return false;
                scope.editing = mode;
            };
            api.revertEdits = scope.revert;
        }
    };

    return {
        restrict: 'E',
        template: template,
        scope: {
            mmsElementId: '@',
            mmsProjectId: '@',
            mmsRefId: '@',
            mmsCommitId: '@',
            mmsViewReorderApi: '<'
        },
        controller: ['$scope', 'ViewService', mmsViewReorderCtrl],
        link: mmsViewReorderLink
    };
}