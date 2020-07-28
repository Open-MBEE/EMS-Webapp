'use strict';

angular.module('mms.directives')
.factory('Utils', ['$q','$uibModal','$timeout', '$templateCache','$rootScope','$compile', '$window', 'URLService', 'CacheService', 'ElementService','ViewService','UtilsService','AuthService', 'PermissionsService', 'growl', Utils]);

/**
 * @ngdoc service
 * @name mms.directives.Utils
 * @requires $q
 * @requires $uibModal
 * @requires $templateCache
 * @requires mms.WorkspaceService
 * @requires mms.ConfigService
 * @requires mms.ElementService
 * @requires _
 *
 * @description
 * Utility methods for performing edit like behavior to a transclude element
 * WARNING These are intended to be internal utility functions and not designed to be used as api
 *
 */
function Utils($q, $uibModal, $timeout, $templateCache, $rootScope, $compile, $window, URLService, CacheService, ElementService, ViewService, UtilsService, AuthService, PermissionsService, growl) {

    function clearAutosaveContent(autosaveKey, elementType) {
        if ( elementType === 'Slot' ) {
            Object.keys($window.localStorage)
                .forEach(function(key){
                    if ( key.indexOf(autosaveKey) !== -1 ) {
                        $window.localStorage.removeItem(key);
                    }
                });
        } else {
            $window.localStorage.removeItem(autosaveKey);
        }
    }

    // var ENUM_ID = '_9_0_62a020a_1105704885400_895774_7947';
    // var ENUM_LITERAL = '_9_0_62a020a_1105704885423_380971_7955';

    var conflictCtrl = function($scope, $uibModalInstance) {
        $scope.ok = function() {
            $uibModalInstance.close('ok');
        };
        $scope.cancel = function() {
            $uibModalInstance.close('cancel');
        };
        $scope.force = function() {
            $uibModalInstance.close('force');
        };
        $scope.merge = function() {
            $uibModalInstance.close('merge');
        };
    };

    var setupValEditFunctions = function(scope) {
        scope.addValueTypes = {string: 'LiteralString', boolean: 'LiteralBoolean', integer: 'LiteralInteger', real: 'LiteralReal'};
        scope.addValue = function(type) {
            var newValueSpec = null;
            if (type === 'LiteralBoolean')
                newValueSpec = UtilsService.createValueSpecElement({type: type, value: false, id: UtilsService.createMmsId(), ownerId: scope.element.id});
            else if (type === 'LiteralInteger')
                newValueSpec = UtilsService.createValueSpecElement({type: type, value: 0, id: UtilsService.createMmsId(), ownerId: scope.element.id});
            else if (type === 'LiteralString')
                newValueSpec = UtilsService.createValueSpecElement({type: type, value: '', id: UtilsService.createMmsId(), ownerId: scope.element.id});
            else if (type === 'LiteralReal')
                newValueSpec = UtilsService.createValueSpecElement({type: type, value: 0.0, id: UtilsService.createMmsId(), ownerId: scope.element.id});
            scope.editValues.push(newValueSpec);
            if (scope.element.type == 'Property' || scope.element.type == 'Port') {
                scope.edit.defaultValue = newValueSpec;
            }
        };
        scope.addValueType = 'LiteralString';
        
        scope.addEnumerationValue = function() {
            var newValueSpec = UtilsService.createValueSpecElement({type: "InstanceValue", instanceId: scope.options[0], id: UtilsService.createMmsId(), ownerId: scope.element.id});
            scope.editValues.push(newValueSpec);
            if (scope.element.type == 'Property' || scope.element.type == 'Port') {
                scope.edit.defaultValue = newValueSpec;
            }
        };

        scope.removeVal = function(i) {
            scope.editValues.splice(i, 1);
        };
    };

    var setupValCf = function(scope) {
        var data = scope.element;
        if (data.type === 'Property' || data.type === 'Port') {
            if (data.defaultValue) {
                scope.values = [data.defaultValue];
            } else {
                scope.values = [];
            }
        }
        if (data.type === 'Slot') {
            scope.values = data.value;
        }
        if (data.type === 'Constraint' && data.specification) {
            scope.values = [data.specification];
        }
        if (data.type === 'Expression') {
            scope.values = data.operand;
        }
    };

    /**
     * @ngdoc function
     * @name mms.directives.Utils#save
     * @methodOf mms.directives.Utils
     *
     * @description
     * save edited element
     *
     * @param {object} edit the edit object to save
     * @param {object} [editorApi=null] optional editor api
     * @param {object} scope angular scope that has common functions
     * @return {Promise} promise would be resolved with updated element if save is successful.
     *      For unsuccessful saves, it will be rejected with an object with type and message.
     *      Type can be error or info. In case of conflict, there is an option to discard, merge,
     *      or force save. If the user decides to discord or merge, type will be info even though
     *      the original save failed. Error means an actual error occured.
     */
    var save = function(edit, editorApi, scope, continueEdit) {
        var deferred = $q.defer();
        if (editorApi && editorApi.save) {
            editorApi.save();
        }
        ElementService.updateElement(edit)
        .then(function(data) {
            deferred.resolve(data);
            setupValCf(scope);
            $rootScope.$broadcast('element.updated', data, continueEdit);
        }, function(reason) {
            if (reason.status === 409) {
                scope.latest = reason.data.elements[0];
                var instance = $uibModal.open({
                    template: $templateCache.get('mms/templates/saveConflict.html'),
                    controller: ['$scope', '$uibModalInstance', conflictCtrl],
                    scope: scope,
                    size: 'lg'
                });
                instance.result.then(function(choice) {
                    if (choice === 'ok') {
                        var reqOb = {elementId: scope.latest.id, projectId: scope.latest._projectId, refId: scope.latest._refId, commitId: 'latest'};
                        ElementService.cacheElement(reqOb, scope.latest, true);
                        ElementService.cacheElement(reqOb, scope.latest, false);
                    } else if (choice === 'force') {
                        edit._read = scope.latest._read;
                        edit._modified = scope.latest._modified;
                        save(edit, editorApi, scope, continueEdit).then(function(resolved) {
                            deferred.resolve(resolved);
                        }, function(error) {
                            deferred.reject(error);
                        });
                    } else {
                        deferred.reject({type: 'cancel'});
                    }
                });
            } else {
                deferred.reject({type: 'error', message: reason.message});
            }
        });
        return deferred.promise;
    };

    /**
     * @ngdoc function
     * @name mms.directives.Utils#hasEdits
     * @methodOf  mms.directives.Utils
     *
     * @description
     * whether editing object has changes compared to base element,
     * currently compares name, doc, property values, if element is not
     * editable, returns false
     *
     * @param {object} editOb edit object
     * @return {boolean} has changes or not
     */
    var hasEdits = function (editOb) {
        editOb._commitId = 'latest';
        var cachedKey = UtilsService.makeElementKey(editOb);
        var elementOb = CacheService.get(cachedKey);
        if (editOb.name !== elementOb.name) {
            return true;
        }
        if (editOb.documentation !== elementOb.documentation) {
            return true;
        }
        if ((editOb.type === 'Property' || editOb.type === 'Port') && !angular.equals(editOb.defaultValue, elementOb.defaultValue)) {
            return true;
        } else if (editOb.type === 'Slot' && !angular.equals(editOb.value, elementOb.value)) {
            return true;
        } else if (editOb.type === 'Constraint' && !angular.equals(editOb.specification, elementOb.specification)) {
            return true;
        }
        return false;
    };

    /**
     * @ngdoc function
     * @name mms.directives.Utils#revertEdits
     * @methodOf mms.directives.Utils
     *
     * @description
     * reset editing object back to base element values for name, doc, values
     *
     * @param {object} editOb scope with common properties
     * @param {object} editorApi editor api to kill editor if reverting changes
     */
    var revertEdits = function(scope, editOb, editorApi) {
        if (editorApi && editorApi.destroy) {
            editorApi.destroy();
        }
        editOb._commitId = 'latest';
        var cachedKey = UtilsService.makeElementKey(editOb);
        var elementOb = CacheService.get(cachedKey);

        if (elementOb.name) {
            editOb.name = elementOb.name;
        }
        editOb.documentation = elementOb.documentation;
        if (editOb.type === 'Property' || editOb.type === 'Port') {
            editOb.defaultValue = JSON.parse(JSON.stringify(elementOb.defaultValue));
            if (editOb.defaultValue) {
                scope.editValues = [editOb.defaultValue];
            } else {
                scope.editValues = [];
            }
        } else if (editOb.type === 'Slot') {
            editOb.value = JSON.parse(JSON.stringify(elementOb.value));
            scope.editValues = editOb.value;
        } else if (editOb.type === 'Constraint' && editOb.specification) {
            editOb.specification = JSON.parse(JSON.stringify(elementOb.specification));
            scope.editValues = [editOb.specification];
        }
    };

    var handleError = function(reason) {
        if (reason.type === 'info')
            growl.info(reason.message);
        else if (reason.type === 'warning')
            growl.warning(reason.message);
        else if (reason.type === 'error')
            growl.error(reason.message);
    };

    /**
     * @ngdoc function
     * @name mms.directives.Utils#isEnumeration
     * @methodOf mms.directives.Utils
     *
     * @description
     * Check if element is enumeration and if true get enumerable options
     *
     * @param {object} elementOb element object
     * @return {Promise} promise would be resolved with options and if object is enumerable.
     *      For unsuccessful saves, it will be rejected with an object with reason.
     */
    var isEnumeration = function(elementOb) {
        var deferred = $q.defer();
        if (elementOb.type === 'Enumeration') {
            var isEnumeration = true;
            var reqOb = {
                elementId: elementOb.id,
                projectId: elementOb._projectId,
                refId: elementOb._refId,
                depth: 1
            };
            ElementService.getOwnedElements(reqOb).then(
                function(val) {
                    var newArray = [];
                     // Filter for enumeration type
                    for (var i = 0; i < val.length; i++) {
                        if (val[i].type === 'EnumerationLiteral') {
                            newArray.push(val[i]);
                        }
                    }
                    newArray.sort(function(a, b) {
                        return a.name.localeCompare(b.name);
                    });
                    deferred.resolve({options: newArray, isEnumeration: isEnumeration});
                },
                function(reason) {
                    deferred.reject(reason);
                }
            );
        } else {
            deferred.resolve({options: [], isEnumeration: false});
        }
        return deferred.promise;
    };

    var getPropertySpec = function(elementOb) {
        var deferred = $q.defer();
        var id = elementOb.typeId;
        var isSlot = false;
        var isEnum = false;
        var options = [];
        if (elementOb.type === 'Slot') {
            isSlot = true;
            id = elementOb.definingFeatureId;
        }
        if (!id) { //no property type, will not be enum
            deferred.resolve({options: options, isEnumeration: isEnum, isSlot: isSlot});
            return deferred.promise;
        }
        // Get defining feature or type info
        var reqOb = {elementId: id, projectId: elementOb._projectId, refId: elementOb._refId};
        ElementService.getElement(reqOb)
        .then(function(value) {
            if (isSlot) {
                if (!value.typeId) {
                    deferred.resolve({options: options, isEnumeration: isEnum, isSlot: isSlot});
                    return;
                }
                //if it is a slot
                reqOb.elementId = value.typeId;
                ElementService.getElement(reqOb) //this gets tyep of defining feature
                .then(function(val) {
                    isEnumeration(val)
                    .then(function(enumValue) {
                        if (enumValue.isEnumeration) {
                            isEnum = enumValue.isEnumeration;
                            options = enumValue.options;
                        }
                        deferred.resolve({options: options, isEnumeration: isEnum, isSlot: isSlot});
                    }, function(reason) {
                        deferred.resolve({options: options, isEnumeration: isEnum, isSlot: isSlot});
                    });
                });
            } else {
                isEnumeration(value)
                .then(function(enumValue) {
                    if (enumValue.isEnumeration) {
                        isEnum = enumValue.isEnumeration;
                        options = enumValue.options;
                    }
                    deferred.resolve({options: options, isEnumeration: isEnum, isSlot:isSlot });
                }, function(reason) {
                    deferred.reject(reason);
                });
            }
        }, function(reason) {
            deferred.resolve({options: options, isEnumeration: isEnum, isSlot: isSlot});
        });
        return deferred.promise;
    };

    /**
    * @ngdoc function
    * @name mms.directives.Utils#startEdit
    * @methodOf mms.directives.Utils
    * @description
    * called by transcludes and section, adds the editing frame
    * uses these in the scope:
    *   element - element object for the element to edit (for sections it's the instance spec)
    *   isEditing - boolean
    *   commitId - calculated commit id
    *   isEnumeration - boolean
    *   recompileScope - child scope of directive scope
    *   skipBroadcast - boolean (whether to broadcast presentationElem.edit for keeping track of open edits)
    * sets these in the scope:
    *   edit - editable element object
    *   isEditing - true
    *   inPreviewMode - false
    *   editValues - array of editable values (for element that are of type Property, Slot, Port, Constraint)
    *
    * @param {object} scope scope of the transclude directives or view section directive
    * @param {object} mmsViewCtrl parent view directive controller
    * @param {object} domElement dom of the directive, jquery wrapped
    * @param {string} template template to compile
    * @param {boolean} doNotScroll whether to scroll to element
    */
    var startEdit = function(scope, mmsViewCtrl, domElement, template, doNotScroll) {
        if (mmsViewCtrl.isEditable() && !scope.isEditing && scope.element && scope.commitId === 'latest' && PermissionsService.hasProjectIdBranchIdEditPermission(scope.mmsProjectId, scope.mmsRefId)) {
            var elementOb = scope.element;
            var reqOb = {elementId: elementOb.id, projectId: elementOb._projectId, refId: elementOb._refId};
            ElementService.getElementForEdit(reqOb)
            .then(function(data) {
                scope.isEditing = true;
                scope.inPreviewMode = false;
                scope.edit = data;

                if (data.type === 'Property' || data.type === 'Port') {
                    if (scope.edit.defaultValue) {
                        scope.editValues = [scope.edit.defaultValue];
                    }
                } else if (data.type === 'Slot') {
                    if (angular.isArray(data.value)) {
                        scope.editValues = data.value;
                    }
                } else if (data.type === 'Constraint' && data.specification) {
                    scope.editValues = [data.specification];
                }
                if (!scope.editValues) {
                    scope.editValues = [];
                }
                /*
                if (scope.isEnumeration && scope.editValues.length === 0) {
                    scope.editValues.push({type: 'InstanceValue', instanceId: null});
                }
                */
                if (template) {
                    if (scope.recompileScope) {
                        scope.recompileScope.$destroy();
                    }
                    scope.recompileScope = scope.$new();
                    domElement.empty();
                    domElement.append(template);
                    $compile(domElement.contents())(scope.recompileScope);
                }
                if (!scope.skipBroadcast) {
                    // Broadcast message for the toolCtrl:
                    $rootScope.$broadcast('presentationElem.edit',scope.edit);
                } else {
                    scope.skipBroadcast = false;
                }
                if (!doNotScroll) {
                    scrollToElement(domElement);
                }
            }, handleError);

            ElementService.isCacheOutdated(scope.element)
            .then(function(data) {
                if (data.status && data.server._modified > data.cache._modified) {
                    growl.warning('This element has been updated on the server');
                }
            });
        }
    };

    /**
    * @ngdoc function
    * @name mms.directives.Utils#saveAction
    * @methodOf mms.directives.Utils
    * @description
    * called by transcludes and section, saves edited element
    * uses these in the scope:
    *   element - element object for the element to edit (for sections it's the instance spec)
    *   elementSaving - boolean
    *   isEditing - boolean
    *   commitId - calculated commit id
    *   bbApi - button bar api - handles spinny
    * sets these in the scope:
    *   elementSaving - boolean
    *
    * @param {object} scope scope of the transclude directives or view section directive
    * @param {object} domElement dom of the directive, jquery wrapped
    * @param {boolean} continueEdit save and continue
    */
    var saveAction = function(scope, domElement, continueEdit) {
        if (scope.elementSaving) {
            growl.info('Please Wait...');
            return;
        }
        clearAutosaveContent(scope.element._projectId + scope.element._refId + scope.element.id, scope.edit.type);
        if (scope.bbApi) {
            if (!continueEdit) {
                scope.bbApi.toggleButtonSpinner('presentation-element-save');
            } else {
                scope.bbApi.toggleButtonSpinner('presentation-element-saveC');
            }
        }
        
        scope.elementSaving = true;

        var work = function() {
            save(scope.edit, scope.editorApi, scope, continueEdit).then(function(data) {
                scope.elementSaving = false;
                if (!continueEdit) {
                    scope.isEditing = false;
                    $rootScope.$broadcast('presentationElem.save', scope.edit);
                }
                growl.success('Save Successful');
                //scrollToElement(domElement);
            }, function(reason) {
                scope.elementSaving = false;
                handleError(reason);
            }).finally(function() {
                if (scope.bbApi) {
                    if (!continueEdit) {
                        scope.bbApi.toggleButtonSpinner('presentation-element-save');
                    } else {
                        scope.bbApi.toggleButtonSpinner('presentation-element-saveC');
                    }
                }
            });
        };
        $timeout(work, 1000, false); //to give ckeditor time to save any changes
    };

    /**
    * @ngdoc function
    * @name mms.directives.Utils#cancelAction
    * @methodOf mms.directives.Utils
    * @description
    * called by transcludes and section, cancels edited element
    * uses these in the scope:
    *   element - element object for the element to edit (for sections it's the instance spec)
    *   edit - edit object
    *   elementSaving - boolean
    *   isEditing - boolean
    *   bbApi - button bar api - handles spinny
    * sets these in the scope:
    *   isEditing - false
    *
    * @param {object} scope scope of the transclude directives or view section directive
    * @param {object} recompile recompile function object
    * @param {object} domElement dom of the directive, jquery wrapped
    */
    var cancelAction = function(scope, recompile, domElement) {
        if (scope.elementSaving) {
            growl.info('Please Wait...');
            return;
        }
        var cancelCleanUp = function() {
            scope.isEditing = false;
            revertEdits(scope, scope.edit);
             // Broadcast message for the ToolCtrl:
            $rootScope.$broadcast('presentationElem.cancel', scope.edit);
            recompile();
            // scrollToElement(domElement);
        };
        if (scope.bbApi) {
            scope.bbApi.toggleButtonSpinner('presentation-element-cancel');
        }
        // Only need to confirm the cancellation if edits have been made:
        if (hasEdits(scope.edit)) {
            var instance = $uibModal.open({
                templateUrl: 'partials/mms/cancelConfirm.html',
                scope: scope,
                controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
                    $scope.ok = function() {
                        clearAutosaveContent(scope.element._projectId + scope.element._refId + scope.element.id, scope.edit.type);
                        $uibModalInstance.close('ok');
                    };
                    $scope.cancel = function() {
                        $uibModalInstance.dismiss();
                    };
                }]
            });
            instance.result.then(function() {
                cancelCleanUp();
            }).finally(function() {
                if (scope.bbApi) {
                    scope.bbApi.toggleButtonSpinner('presentation-element-cancel');
                }
            });
        } else {
            cancelCleanUp();
            if (scope.bbApi) {
                scope.bbApi.toggleButtonSpinner('presentation-element-cancel');
            }
        }
    };

    var deleteAction = function(scope, bbApi, section) {
        if (scope.elementSaving) {
            growl.info('Please Wait...');
            return;
        }
        // var id = section ? section.id : scope.view.id;
        // ElementService.isCacheOutdated(id, scope.ws)
        // .then(function(status) {
        //     if (status.status) {
        //         if (section && section.specification && !angular.equals(section.specification, status.server.specification)) {
        //             growl.error('The view section contents is outdated, refresh the page first!');
        //             return;
        //         } else if (!section && scope.view._contents && !angular.equals(scope.view._contents, status.server._contents)) {
        //             growl.error('The view contents is outdated, refresh the page first!');
        //             return;
        //         }
        //     }
             realDelete();
        // }, function(reason) {
        //     growl.error('Checking if view contents is up to date failed: ' + reason.message);
        // });
        function realDelete() {
            bbApi.toggleButtonSpinner('presentation-element-delete');
            scope.name = scope.edit.name;

            var instance = $uibModal.open({
                templateUrl: 'partials/mms/confirmRemove.html',
                scope: scope,
                controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
                    $scope.ok = function() {
                        clearAutosaveContent(scope.element._projectId + scope.element._refId + scope.element.id, scope.edit.type);
                        $uibModalInstance.close('ok');
                    };
                    $scope.cancel = function() {
                        $uibModalInstance.dismiss();
                    };
                }]
            });
            instance.result.then(function() {
                var viewOrSec = section ? section : scope.view;
                var reqOb = {elementId: viewOrSec.id, projectId: viewOrSec._projectId, refId: viewOrSec._refId, commitId: 'latest'};
                ViewService.removeElementFromViewOrSection(reqOb, scope.instanceVal)
                .then(function(data) {
                    if (ViewService.isSection(scope.instanceSpec) || ViewService.isTable(scope.instanceSpec) || ViewService.isFigure(scope.instanceSpec) || ViewService.isEquation(scope.instanceSpec)) {
                        // Broadcast message to TreeCtrl:
                        $rootScope.$broadcast('viewctrl.delete.element', scope.instanceSpec);
                    }

                    $rootScope.$broadcast('view-reorder.refresh');

                     // Broadcast message for the ToolCtrl:
                    $rootScope.$broadcast('presentationElem.cancel',scope.edit);

                    growl.success('Remove Successful');
                }, handleError);

            }).finally(function() {
                scope.bbApi.toggleButtonSpinner('presentation-element-delete');
            });
        }
    };

    /**
    * @ngdoc function
    * @name mms.directives.Utils#previewAction
    * @methodOf mms.directives.Utils
    * @description
    * called by transcludes and section, previews edited element
    * uses these in the scope:
    *   element - element object for the element to edit (for sections it's the instance spec)
    *   edit - edit object
    *   elementSaving - boolean
    *   inPreviewMode - boolean
    *   isEditing - boolean
    *   bbApi - button bar api - handles spinny
    * sets these in the scope:
    *   skipBroadcast - true
    *   inPreviewMode - false
    *   isEditing - false
    *   elementSaving - false
    *
    * @param {object} scope scope of the transclude directives or view section directive
    * @param {object} recompile recompile function object
    * @param {object} domElement dom of the directive, jquery wrapped
    */
    var previewAction = function(scope, recompile, domElement) {
        if (scope.elementSaving) {
            growl.info('Please Wait...');
            return;
        }
        if (scope.edit && hasEdits(scope.edit) && !scope.inPreviewMode) {
            scope.skipBroadcast = true; //preview next click to go into edit mode from broadcasting
            scope.inPreviewMode = true;
            recompile(true);
        } else { //nothing has changed, cancel instead of preview
            if (scope.edit && scope.isEditing) {
                // Broadcast message for the ToolCtrl to clear out the tracker window:
                $rootScope.$broadcast('presentationElem.cancel', scope.edit);
                if (scope.element) {
                    recompile();
                }
            }
        }
        scope.isEditing = false;
        scope.elementSaving = false;
        scrollToElement(domElement);
    };

    var isDirectChildOfPresentationElementFunc = function(element, mmsViewCtrl) {
        var parent = element[0].parentElement;
        while (parent && parent.nodeName !== 'MMS-VIEW-PRESENTATION-ELEM' && parent.nodeName !== 'MMS-VIEW') {
            if (mmsViewCtrl.isTranscludedElement(parent.nodeName)) {
                return false;
            }
            if (parent.nodeName === 'MMS-VIEW-TABLE' || parent.nodeName === 'MMS-VIEW-LIST' || parent.nodeName === 'MMS-VIEW-SECTION')
                return false;
            parent = parent.parentElement;
        }
        if (parent && parent.nodeName !== 'MMS-VIEW'){
            return true;
        }
        return false;
    };

    var hasHtml = function(s) {
        if (s.indexOf('<p>') === -1)
            return false;
        return true;
    };

    var scrollToElement = function(domElement) {
        $timeout(function() {
            var el = domElement.get(0);
            if (domElement.isOnScreen())
                return;
            el.scrollIntoView();
        }, 500, false);
    };

    var addPeCtrl = function($scope, $uibModalInstance, $filter) {
        $scope.oking = false;
        $scope.newPe = {name:''};
        $scope.createForm = true;

        var addPECallback = function(elementOb) {
            if ($scope.oking) {
                growl.info("Please wait...");
                return;
            }
            $scope.oking = true;
            var instanceVal = {
                instanceId: elementOb.id,
                type: "InstanceValue"
            };
            ViewService.addElementToViewOrSection($scope.viewOrSectionOb, instanceVal, $scope.addPeIndex)
                .then(function(data) {
                    var elemType = $scope.presentationElemType;
                    successUpdates(elemType, $scope.viewOrSectionOb.id);
                    $uibModalInstance.close(data);
                }, function(reason) {
                    growl.error($scope.presentationElemType +" Add Error: " + reason.message);
                }).finally(function() {
                $scope.oking = false;
            });
        };

        var peFilterQuery = function () {
            var classIdOb = {};
            if ($scope.presentationElemType === 'Table') {
                classIdOb.classifierIds = [ViewService.TYPE_TO_CLASSIFIER_ID.TableT, ViewService.TYPE_TO_CLASSIFIER_ID.Table];
            } else if ($scope.presentationElemType === 'List') {
                classIdOb.classifierIds  = [ViewService.TYPE_TO_CLASSIFIER_ID.ListT, ViewService.TYPE_TO_CLASSIFIER_ID.List];
            } else if ($scope.presentationElemType === 'Image') {
                classIdOb.classifierIds = [ViewService.TYPE_TO_CLASSIFIER_ID.ImageT, ViewService.TYPE_TO_CLASSIFIER_ID.Image];
            } else if ($scope.presentationElemType === 'Paragraph') {
                classIdOb.classifierIds = [ViewService.TYPE_TO_CLASSIFIER_ID.ParagraphT, ViewService.TYPE_TO_CLASSIFIER_ID.Paragraph];
            } else if ($scope.presentationElemType === 'Section') {
                classIdOb.classifierIds = [ViewService.TYPE_TO_CLASSIFIER_ID.SectionT, ViewService.TYPE_TO_CLASSIFIER_ID.Section];
            } else {
                classIdOb.classifierIds = [ViewService.TYPE_TO_CLASSIFIER_ID[$scope.presentationElemType]];
            }
            var obj = {};
            obj.terms = classIdOb;
            return obj;
        };

        $scope.searchOptions = {
            callback: addPECallback,
            itemsPerPage: 200,
            filterQueryList: [peFilterQuery],
            hideFilterOptions: true
        };

        $scope.ok = function() {
            if ($scope.oking) {
                growl.info("Please wait...");
                return;
            }
            $scope.oking = true;
            ViewService.createInstanceSpecification($scope.viewOrSectionOb, $scope.presentationElemType, $scope.newPe.name, $scope.addPeIndex)
            .then(function(data) {
                var elemType = $scope.presentationElemType;
                successUpdates(elemType, $scope.viewOrSectionOb.id);
                $uibModalInstance.close(data);
            }, function(reason) {
                growl.error($scope.presentationElemType + " Add Error: " + reason.message);
            }).finally(function() {
                $scope.oking = false;
            });
        };

        $scope.cancel = function() {
            $uibModalInstance.dismiss();
        };
    };

    var successUpdates = function (elemType, id) {
        $rootScope.$broadcast('view-reorder.refresh');
        $rootScope.$broadcast('view.reorder.saved', id);
        growl.success("Adding " + elemType + " Successful");
        // Show comments when creating a comment PE
        if (elemType === 'Comment' && !$rootScope.veCommentsOn) {
            $timeout(function() {
                $('.show-comments').click();
            }, 0, false);
        }
    };

    /**
     * @ngdoc method
     * @name mms.directives.Utils#addPresentationElement
     * @methodOf mms.directives.Utils
     *
     * @description
     * Utility to add a new presentation element to view or section
     *
     * @param {Object} scope controller scope, expects $scope.ws (string) and $scope.site (object) to be there
     * @param {string} type type of presentation element (Paragraph, Section)
     * @param {Object} viewOrSection the view or section (instance spec) object
     */
    var addPresentationElement = function($scope, type, viewOrSectionOb) {
        $scope.viewOrSectionOb = viewOrSectionOb;
        $scope.presentationElemType = type;
        var templateUrlStr = 'partials/mms/add-pe.html';

        var instance = $uibModal.open({
            templateUrl: templateUrlStr,
            scope: $scope,
            controller: ['$scope', '$uibModalInstance', '$filter', addPeCtrl]
        });
        instance.result.then(function(data) {
            if (data.type !== 'InstanceSpecification' || ViewService.isSection(data)) {
                return; //do not open editor for existing pes added or if pe/owner is a section
            }
            $timeout(function() { //auto open editor for newly added pe
                $('#' + data.id).find('mms-transclude-doc,mms-transclude-com').click();
            }, 0, false);
        });
    };

    /**
     * @ngdoc method
     * @name mms.directives.Utils#reopenUnsavedElts
     * @methodOf mms.directives.Utils
     * @description
     * called by transcludes when users have unsaved edits, leaves that view, and comes back to that view.
     * the editor will reopen if there are unsaved edits.
     * assumes no reload.
     * uses these in the scope:
     *   element - element object for the element to edit (for sections it's the instance spec)
     *   ve_edits - unsaved edits object
     *   startEdit - pop open the editor window
     * @param {object} scope scope of the transclude directives or view section directive
     * @param {String} transcludeType name, documentation, or value
     */
    var reopenUnsavedElts = function(scope, transcludeType){
        var unsavedEdits = {};
        if (scope.$root.ve_edits) {
            unsavedEdits = scope.$root.ve_edits;
        }
        var key = scope.element.id + '|' + scope.element._projectId + '|' + scope.element._refId;
        var thisEdits = unsavedEdits[key];
        if (!thisEdits || scope.commitId !== 'latest') {
            return;
        }
        if (transcludeType === 'value') {
            if (scope.element.type === 'Property' || scope.element.type === 'Port') {
                if (scope.element.defaultValue.value !== thisEdits.defaultValue.value ||
                        scope.element.defaultValue.instanceId !== thisEdits.defaultValue.instanceId) {
                    scope.startEdit();
                }
            } else if (scope.element.type === 'Slot') {
                var valList1 = thisEdits.value;
                var valList2 = scope.element.value;

                // Check if the lists' lengths are the same
                if (valList1.length !== valList2.length) {
                    scope.startEdit();
                } else {
                    for (var j = 0; j < valList1.length; j++) {
                        if (valList1[j].value !== valList2[j].value || valList1[j].instanceId !== valList2[j].instanceId) {
                            scope.startEdit();
                            break;
                        }
                    }
                }
            }
        } else if (scope.element[transcludeType] !== thisEdits[transcludeType]) {
            scope.startEdit();
        }
    };
    /**
     * @ngdoc method
     * @name mms.directives.Utils#revertAction
     * @methodOf mms.directives.Utils
     * @description
     * called by transcludes and section, cancels edited element
     * uses these in the scope:
     *   element - element object for the element to edit (for sections it's the instance spec)
     *   edit - edit object
     *   elementSaving - boolean
     *   isEditing - boolean
     *   bbApi - button bar api - handles spinny
     * sets these in the scope:
     *   isEditing - false
     *
     * @param {object} scope scope of the transclude directives or view section directive
     * @param {object} recompile recompile function object
     * @param {object} domElement dom of the directive, jquery wrapped
     */
    var revertAction = function($scope, preview, domElement) {
        var templateUrlStr = 'mms/templates/revertConfirm.html';

        var instance = $uibModal.open({
            templateUrl: templateUrlStr,
            scope: $scope,
            size: 'lg',
            windowClass: 'revert-spec',
            controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
                $scope.ok = function() {
                    if ($scope.oking) {
                        growl.info("Please wait...");
                        return;
                    }
                    $scope.oking = true;
                    var revertEltInfo = {id: $scope.mmsElementId, _projectId : $scope.mmsProjectId, _refId: $scope.mmsRefId};
                    var reqOb = {elementId: $scope.mmsElementId, projectId: $scope.mmsProjectId, refId: $scope.baseCommit.refSelected.id, commitId: $scope.baseCommit.commitSelected.id};
                    ElementService.getElement(reqOb, 2, false)
                    .then(function(data) {
                        if (data.name) {
                            revertEltInfo.name = data.name;
                        }
                        revertEltInfo.documentation = data.documentation;
                        if (data.defaultValue) {
                            revertEltInfo.defaultValue = data.defaultValue;
                        }
                        if (data.value) {
                            revertEltInfo.value = data.value;
                        }

                        ElementService.updateElement(revertEltInfo)
                        .then(function(data) {
                            $rootScope.$broadcast('element.updated', data, false);
                            $uibModalInstance.close();
                            growl.success("Element reverted");
                        }, function(reason) {
                            growl.error("Revert not compeleted - Error: " + reason.message);
                        }).finally(function() {
                            $scope.oking = false;
                        });
                    });
                };
                $scope.cancel = function() {
                    $uibModalInstance.dismiss();
                };
            }]
        });
        instance.result.then(function(data) {
              // TODO: do anything here?
        });
    };

    var checkForDuplicateInstances = function(operand) {
        var seen = {}, dups = [], curr;
        for (var i = 0; i < operand.length; i++) {
            curr = operand[i].instanceId;
            if (curr) {
                if (seen[curr]) {
                    dups.push(operand[i]);
                    operand.splice(i, 1);
                    i--;
                    continue;
                }
                seen[curr] = true;
            } else {
                //instanceId is invalid?
            }
        }
        return dups;
    };

    var fixImgSrc = function(imgDom) {
        var src = imgDom.attr('src');
        if (src) {
            imgDom.attr('src', src + '?token=' + AuthService.getTicket());            
        }
        if (imgDom.width() < 860) { //keep image relative centered with text if less than 9 in
            return;
        }
        var parent = imgDom.parent('p');
        if (parent.length > 0) {
            if (parent.css('text-align') == 'center' || parent.hasClass('image-center')) {
                imgDom.addClass('image-center');
            }
            imgDom.unwrap(); //note this removes parent p and puts img and any of its siblings in its place
        }
    };

    var toggleLeftPane = function (searchTerm) {
        if ( searchTerm && !$rootScope.ve_tree_pane.closed ) {
            $rootScope.ve_tree_pane.toggle();
        }

        if ( !searchTerm && $rootScope.ve_tree_pane.closed ) {
            $rootScope.ve_tree_pane.toggle();
        }
    };

    var focusOnEditorAfterAddingWidgetTag = function(editor) {
        var element = editor.widgets.focused.element.getParent();
        var range = editor.createRange();
        if(range) {
            range.moveToClosestEditablePosition(element, true);
            range.select();
        }
    };

    return {
        save: save,
        hasEdits: hasEdits,
        revertEdits: revertEdits,
        startEdit: startEdit,
        saveAction: saveAction,
        cancelAction: cancelAction,
        deleteAction: deleteAction,
        previewAction: previewAction,
        isDirectChildOfPresentationElementFunc: isDirectChildOfPresentationElementFunc,
        hasHtml: hasHtml,
        isEnumeration: isEnumeration,
        getPropertySpec: getPropertySpec,
        addPresentationElement: addPresentationElement,
        setupValCf: setupValCf,
        setupValEditFunctions: setupValEditFunctions,
        revertAction: revertAction,
        clearAutosaveContent: clearAutosaveContent,
        reopenUnsavedElts: reopenUnsavedElts,
        checkForDuplicateInstances: checkForDuplicateInstances,
        fixImgSrc: fixImgSrc,
        focusOnEditorAfterAddingWidgetTag: focusOnEditorAfterAddingWidgetTag,
        toggleLeftPane: toggleLeftPane
    };

}
