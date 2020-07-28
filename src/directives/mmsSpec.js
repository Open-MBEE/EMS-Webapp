'use strict';

angular.module('mms.directives')
.directive('mmsSpec', ['Utils', 'AuthService', 'ElementService', 'UtilsService', 'ViewService', 'PermissionsService',
    '$templateCache', 'growl', '_', mmsSpec]);

/**
 * @ngdoc directive
 * @name mms.directives.directive:mmsSpec
 *
 * @requires mms.Utils
 * @requires mms.AuthService
 * @requires mms.ElementService
 * @requires mms.ViewService
 * @requires $compile
 * @requires $templateCache
 * @requires growl
 * @requires _
 *
 * @restrict E
 *
 * @description
 * Outputs a "spec window" of the element whose id is specified. Spec includes name,
 * documentation, and value if the element is a property. Also last modified time,
 * last user, element id. Editability is determined by a param and also element
 * editability. Documentation and string values can have html and can transclude other
 * element properties. Conflict can occur during save based on last server read time
 * and offers choice of force save, discard edit or simple merge. To control saving
 * or editing pass in an api object that will be populated with methods (see methods seciton):
 *
 * ## Example spec with full edit (given permission)
 * ### controller (js)
 *  <pre>
    angular.module('app', ['mms.directives'])
    .controller('SpecCtrl', ['$scope', function($scope) {
        $scope.api = {}; //empty object to be populated by the spec api
        $scope.edit = function() {
            $scope.api.setEditing(true);
        };
        $scope.save = function() {
            $scope.api.save()
            .then(function(e) {
                //success
            }, function(reason) {
                //failed
            });
        };
    }]);
    </pre>
 * ### template (html)
 *  <pre>
    <div ng-controller="SpecCtrl">
        <button ng-click="edit()">Edit</button>
        <button ng-click="save()">Save</button>
        <mms-spec mms-eid="element_id" mms-edit-field="all" mms-spec-api="api"></mms-spec>
    </div>
    </pre>
 * ## Example for showing an element spec at a certain time
 *  <pre>
    <mms-spec mms-eid="element_id" mms-version="2014-07-01T08:57:36.915-0700"></mms-spec>
    </pre>
 * ## Example for showing a current element with nothing editable
 *  <pre>
    <mms-spec mms-eid="element_id" mms-edit-field="none"></mms-spec>
    </pre>
 *
 * @param {string} mmsElementId The id of the view
 * @param {string} mmsProjectId The project id for the view
 * @param {string=master} mmsRefId Reference to use, defaults to master
 * @param {string=latest} mmsCommitId Commit ID, default is latest
 * @param {Object=} mmsSpecApi An empty object that'll be populated with api methods
 * @param {Object=} mmsElement An element object, if this is provided, a read only
 *      element spec for it would be shown, this will not use mms services to get the element
 */
function mmsSpec(Utils, AuthService, ElementService, UtilsService, ViewService, PermissionsService, $templateCache, growl, _) {
    var template = $templateCache.get('mms/templates/mmsSpec.html');

    var mmsSpecLink = function(scope, domElement, attrs) {
        var ran = false;
        var lastid = null; //race condition check
        var keepMode = false;
        scope.editing = false;
        scope.editable = true;
        scope.gettingSpec = false;
        scope.isEnumeration = false;
        //TODO pass proper args
        scope.propertyTypeClicked = function(id) {
            var elmentOb = {id: id, _projectId: scope.mmsProjectId, _refId: scope.mmsRefId};
            scope.$emit('elementSelected', elmentOb);
        };
        if (scope.mmsElement) {
            scope.element = scope.mmsElement;
            Utils.setupValCf(scope);
            scope.editable = false;
            return;
        }
        scope.addHtml = function(value) {
            value.value = "<p>" + value.value + "</p>";
        };
        scope.editorApi = {};

        var getTypeClass = function(element) {
            // Get Type
            scope.elementTypeClass = UtilsService.getElementTypeClass(element, ViewService.getElementType(element));
        };

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSpec#changeElement
         * @methodOf mms.directives.directive:mmsSpec
         *
         * @description
         * change element in the spec, this would reevaluate whether it's editable
         *
         * @param {string} newVal new element id
         */
        var changeElement = function(newVal, oldVal) {
            if (!newVal || (newVal === oldVal && ran) || !scope.mmsProjectId) {
                return;
            }
            scope.relatedDocuments = null;
            ran = true;
            lastid = newVal;
            if (scope.edit && scope.editorApi.save) {
                scope.editorApi.save();
            }
            scope.isEnumeration = false;
            scope.isSlot = false;
            scope.gettingSpec = true;
            var extended = true;
            if (scope.mmsCommitId && scope.mmsCommitId !== 'latest') {
                extended = false;
            }
            var reqOb = {elementId: scope.mmsElementId, projectId: scope.mmsProjectId, refId: scope.mmsRefId, commitId: scope.mmsCommitId, extended: extended};
            ElementService.getElement(reqOb, 2, false)
            .then(function(data) {
                if (newVal !== lastid) {
                    return;
                }
                scope.element = data;
                Utils.setupValCf(scope);
                if (!scope.mmsCommitId || scope.mmsCommitId === 'latest') {
                    ElementService.search(reqOb, {
                        size: 1,
                        sort : [{ _modified : {order : "desc"}}],
                        query: {bool: {filter: [{term: {id: data.id}}, {term: {'_projectId': data._projectId}}]}}
                    }, 2).then(function(searchResultOb) {
                        if (newVal !== lastid) {
                            return;
                        }
                        var searchResult = searchResultOb.elements;
                        if (searchResult && searchResult.length == 1 && searchResult[0].id === data.id && searchResult[0]._relatedDocuments.length > 0) {
                            scope.relatedDocuments = searchResult[0]._relatedDocuments;
                        }
                    });
                }
                if ((scope.mmsCommitId !== 'latest' && scope.mmsCommitId) || !PermissionsService.hasProjectIdBranchIdEditPermission(scope.mmsProjectId, scope.mmsRefId)) {
                    scope.editable = false;
                    scope.edit = null;
                    scope.editing = false;
                } else {
                    ElementService.getElementForEdit(reqOb)
                    .then(function(data) {
                        if (newVal !== lastid)
                            return;
                        scope.edit = data;
                        scope.editable = true;
                        if (!keepMode)
                            scope.editing = false;
                        keepMode = false;
                        if (scope.edit.type === 'Property' || scope.edit.type === 'Port' || scope.edit.type === 'Slot') {// angular.isArray(scope.edit.value)) {
                            if (scope.edit.defaultValue)
                                scope.editValues = [scope.edit.defaultValue];
                            else if (scope.edit.value)
                                scope.editValues = scope.edit.value;
                            else
                                scope.editValues = [];
                                Utils.getPropertySpec(scope.element)
                                .then( function(value) {
                                    scope.isEnumeration = value.isEnumeration;
                                    scope.isSlot = value.isSlot;
                                    scope.options = value.options;
                                }, function(reason) {
                                    growl.error('Failed to get property spec: ' + reason.message);
                                });
                        }
                        if (scope.edit.type === 'Constraint' && scope.edit.specification) {
                            scope.editValues = [scope.edit.specification];
                        }
                    });
                }
                getTypeClass(scope.element);
                scope.elementDataLink = '/alfresco/service/projects/'+scope.element._projectId+'/refs/'+scope.element._refId+'/elements/'+scope.element.id+'?commitId='+scope.element._commitId+'&alf_ticket='+AuthService.getTicket();
                scope.gettingSpec = false;
            }, function(reason) {
                scope.gettingSpec = false;
                //growl.error("Getting Element Error: " + reason.message);
            });
        };
        scope.changeElement = changeElement;
        scope.$watch('mmsElementId', changeElement);
        scope.$watch('mmsProjectId', changeElement);
        scope.$watch('mmsCommitId', changeElement);
        scope.$watch('mmsRefId', changeElement);

        scope.copyToClipboard = function($event, selector) {
            UtilsService.copyToClipboard(domElement.find(selector), $event);
        };

        scope.cleanupVal = function(obj) {
            obj.value = parseInt(obj.value);
        };

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSpec#revertEdits
         * @methodOf mms.directives.directive:mmsSpec
         *
         * @description
         * reset editing object back to base element values for name, doc, values
         *
         */
        scope.revertEdits = function() {
            Utils.revertEdits(scope, scope.edit, scope.editorApi);
        };

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSpec#save
         * @methodOf mms.directives.directive:mmsSpec
         *
         * @description
         * save edited element
         *
         * @return {Promise} promise would be resolved with updated element if save is successful.
         *      For unsuccessful saves, it will be rejected with an object with type and message.
         *      Type can be error or info. In case of conflict, there is an option to discard, merge,
         *      or force save. If the user decides to discord or merge, type will be info even though
         *      the original save failed. Error means an actual error occured.
         */
        scope.save = function() {
            return Utils.save(scope.edit, scope.editorApi, scope, false);
        };

        scope.hasHtml = function(s) {
            return Utils.hasHtml(s);
        };

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSpec#hasEdits
         * @methodOf mms.directives.directive:mmsSpec
         *
         * @description
         * whether editing object has changes compared to base element,
         * currently compares name, doc, property values, if element is not
         * editable, returns false
         *
         * @return {boolean} has changes or not
         */
        scope.hasEdits = function() {
            return Utils.hasEdits(scope.edit);
        };

        Utils.setupValEditFunctions(scope);
        
        if (angular.isObject(scope.mmsSpecApi)) {
            var api = scope.mmsSpecApi;
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsSpec#toggleEditing
             * @methodOf mms.directives.directive:mmsSpec
             *
             * @description
             * toggles editing
             *
             * @return {boolean} toggle successful
             */
            api.toggleEditing = function() {
                if (!scope.editing) {
                    if (scope.editable)
                        scope.editing = true;
                    else
                        return false;
                } else {
                    scope.editing = false;
                }
                return true;
            };
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsSpec#setEditing
             * @methodOf mms.directives.directive:mmsSpec
             *
             * @description
             * sets editing state
             *
             * @param {boolean} mode true or false
             * @return {boolean} set successful
             */
            api.setEditing = function(mode) {
                if (mode) {
                    if (scope.editable)
                        scope.editing = true;
                    else
                        return false;
                } else
                    scope.editing = false;
                return true;
            };
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsSpec#getEditing
             * @methodOf mms.directives.directive:mmsSpec
             *
             * @description
             * get editing state
             *
             * @return {boolean} editing or not
             */
            api.getEditing = function() {
                return scope.editing;
            };
            api.save = scope.save;
            api.revertEdits = scope.revertEdits;
            api.changeElement = scope.changeElement;
            api.hasEdits = scope.hasEdits;
            /**
             * @ngdoc function
             * @name mms.directives.directive:mmsSpec#getEdits
             * @methodOf mms.directives.directive:mmsSpec
             *
             * @description
             * get current edit object
             *
             * @return {Object} may be null or undefined, if not, is
             *  current element object that can be edited (may include changes)
             */
            api.getEdits = function() {
                return scope.edit;
            };

            api.setEdit = function(id) {
                scope.mmsElementId = id;
            };

            api.keepMode = function() {
                keepMode = true;
            };

            api.editorSave = function() {
                if (scope.edit && scope.editorApi.save)
                    scope.editorApi.save();
            };
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
            mmsElement: '<?',
            mmsSpecApi: '<?',
            noEdit: '@',
            mmsDisplayOldContent: '<?'
        },
        link: mmsSpecLink
    };
}
