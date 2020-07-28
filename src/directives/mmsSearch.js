'use strict';

angular.module('mms.directives')
    .directive('mmsSearch', ['$window', '$anchorScroll', 'CacheService', 'ElementService', 'ProjectService', 'UtilsService', 'ViewService', '_', 'growl', '$templateCache', '$timeout', mmsSearch]);

/**
 * @ngdoc directive
 * @name mms.directives.directive:mmsSearch
 *
 * @restrict E
 *
 * @description
 * TBA
 * 
 * @scope
 *
 */
function mmsSearch($window, $anchorScroll, CacheService, ElementService, ProjectService, UtilsService, ViewService, _, growl, $templateCache, $timeout) {
    var template = $templateCache.get('mms/templates/mmsSearch.html');
    return {
        restrict: 'E',
        template: template,
        link: mmsSearchLink,
        scope: {
            mmsOptions: '<',
            mmsProjectId: '@',
            mmsRefId: '@'
        }
    };


    function mmsSearchLink(scope, element, attrs) {
        // Main search variables
        var baseSearchResults = [];
        scope.showFilterOptions = !scope.mmsOptions.hideFilterOptions;
        scope.searchLoading = false;
        scope.mainSearch = {
            searchText: '',
            searchType: {
                id: 'all',
                label: 'All Fields'
            },
            selectedSearchMetatypes: []
        };
        scope.docsviews = {
            selected: false
        };
        scope.refId = scope.mmsRefId ? scope.mmsRefId : 'master';

        scope.qualifiedNameFormatter = function(qualifiedName) {
            if (qualifiedName) {
                var parts = qualifiedName.split('/');
                var result = qualifiedName;
                if (parts.length > 7) {
                    result = parts.slice(0, 4).join('/') + '/.../' + parts.slice(parts.length - 3, parts.length).join('/');
                }
                return result;
            }
        };

        scope.expandQualifiedName = function($event, qualifiedName) {
            $event.currentTarget.innerHTML = qualifiedName;
        };

        scope.showMoreRelatedViews = function(element) {
            element.remainingRelatedDocuments = element.allRelatedDocuments.slice(3, element.allRelatedDocuments.length);
        };
        // Search resulte settings
        scope.activeFilter = [];

        // Pagination settings
        scope.totalResults = 0;
        scope.paginationCache = [];
        scope.currentPage = 0;
        scope.itemsPerPage = 100;

        // Advanced search settings
        scope.advanceSearch = false;
        scope.advanceSearchRows = [];
        scope.stringQuery = scope.mainSearch.searchText; 

        // View propery settings
        scope.showSearchResultProps = false;
        scope.switchText = 'More';
        scope.limitForProps = 6;

        scope.closeSearch = function () {
            $window.history.back();
        };

        // Set functions
        ProjectService.getProjectMounts(scope.mmsProjectId, scope.refId); //ensure project mounts object is cached
        // Function used to get string value of metatype names for advanced search
        var getMetatypeSelection = function (id) {
            var mainElement = angular.element(id);
            return mainElement.find('div').attr('value');
        };

        // Get metatypes for dropdown options
        var getMetaTypes = function () {
            // scope.metatypeSearch = "fa fa-spin fa-spinner";
            // ProjectService.getMetatypes(scope.mmsProjectId, scope.refId)
            //     .then(function (data) {
            //         // cache metatypes
            //         scope.metatypeList = data;
            //     }, function (reason) {
            //         growl.error("Search Error: " + reason.message);
            //     }).finally(function () {
            //         scope.metatypeSearch = "";
            //     });
        };
        getMetaTypes();

        scope.getTypeClass = function (element) {
            // Get Type
            return UtilsService.getElementTypeClass(element, ViewService.getElementType(element));
        };

        // Set search options
        scope.fieldTypeList = [{
                id: 'all',
                label: 'All Fields'
            },
            {
                id: 'name',
                label: 'Name'
            },
            {
                id: 'documentation',
                label: 'Documentation'
            },
            {
                id: 'value',
                label: 'Value'
            },
            {
                id: 'id',
                label: 'ID'
            },
            {
                id: 'metatype',
                label: 'Metatype'
            }
        ];

        scope.operatorList = ['And', 'Or', 'And Not'];

        // settings for multiselect metatype dropdown
        scope.metatypeSettings = {
            scrollableHeight: '300px',
            scrollable: true,
            enableSearch: true,
            displayProp: 'name',
            showCheckAll: false,
            smartButtonMaxItems: 10,
            buttonClasses: ''
        };

        // event handler for multiselect metatype dropdown
        scope.multiselectEvent = {
            onItemSelect: function (ob) {
                $timeout(function () {
                    scope.stringQueryUpdate();
                }, 500);
            },
            onItemDeselect: function (ob) {
                $timeout(function () {
                    scope.stringQueryUpdate();
                }, 500);
            },
            onDeselectAll: function (ob) {
                $timeout(function () {
                    scope.stringQueryUpdate();
                }, 500);
            }
        };

        // Filter options
        scope.getActiveFilterClass = function (item) {
            if (!scope.activeFilter.length) {
                return '';
            }
            return _.includes(scope.activeFilter, item);
        };

        scope.filterSearchResults = function (type) {
            var tempArr = _.clone(scope.activeFilter);
            if (_.includes(scope.activeFilter, type) ) {
                _.pull(scope.activeFilter, type);
            } else {
                scope.activeFilter.push(type);
            }
            _applyFilters();
        };

        var _applyFilters = function () {
            if (!scope.activeFilter.length) {
                scope.searchResults = baseSearchResults;
            } else {
                scope.searchResults = _.filter(baseSearchResults, function (item) {
                    return _.includes(scope.activeFilter, ViewService.getElementType(item));
                });
            }
        };

        scope.filterOptions = [
            { display: "Documents", icon: null, type: "Document" },
            // { display: "Sections/Views", icon: null, type: "View", "Section" },
            { display: 'Text', icon:"pe-type-Paragraph", type: "Paragraph" },
            { display: 'Tables', icon:"pe-type-Table", type: "Table" },
            { display: 'Images', icon:"pe-type-Image", type: "Image" },
            { display: 'Equations', icon:"pe-type-Equation", type: "Equation" },
            { display: 'Comments', icon:"pe-type-Comment", type: "Comment" },
            { display: 'Sections', icon:"pe-type-Section", type: "Section" },
            { display: 'Views', icon:"pe-type-View", type: "View" },
            { display: 'Requirements', icon:"pe-type-Req", type: "Requirement" }
        ];

        // var findRefineOptions = function (results) {
        //     var presentationElements = _.map(results, ViewService.getElementType);
        //     var uniqTypes = _.uniq(presentationElements);
        //     scope.filterOptions = _.difference(uniqTypes, [false, undefined, '']);
        // };

        scope.$watch('searchResults', function (newVal) {
            if (!newVal)
                return;
            if (!scope.mmsOptions.getProperties) {
                return;
            }
            newVal.forEach(function (elem) {
                if (elem._properties) {
                    return;
                }
                // mms does not return properties will need to make a call for the results whose type is Class
                // Call ElementService.getOwnedElements with depth of 2
                // filter out results that have type = to Property and Slot
                // for Property check that ownerId is same as the class id
                if (elem.type === 'Class' || elem.type === 'Component') {
                    var reqOb = {
                        elementId: elem.id,
                        projectId: elem._projectId,
                        refId: elem._refId,
                        depth: 2
                    };
                    ElementService.getOwnedElements(reqOb, 2)
                        .then(function (data) {
                            var properties = [];
                            //TODO might not be elements
                            angular.forEach(data, function (elt) {
                                if (elt.type === 'Property' && elt.ownerId == elem.id) {
                                    properties.push(elt);
                                } else if (elt.type === 'Slot') {
                                    properties.push(elt);
                                }
                            });
                            elem._properties = properties;
                            // OLD CODE - splits into 3cols
                            // if (elem._properties && elem._properties[0]) {
                            //     var properties2 = [];
                            //     for (var i = 0; i < elem._properties.length; i++) {
                            //         if (i % 3 === 0) {
                            //             properties2.push([]);
                            //         }
                            //         properties2[properties2.length - 1].push(elem._properties[i]);
                            //     }
                            //     elem._properties2 = properties2;
                            // }
                        });
                }
            });
        });


        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSearch#stringQueryUpdate
         * @methodOf mms.directives.directive:mmsSearch
         *
         * @description
         * Updates advanced search main query input
         */
        scope.stringQueryUpdate = function () {
            var rowLength = scope.advanceSearchRows.length;
            scope.stringQuery = Array(rowLength + 1).join('(');
            scope.stringQuery += scope.mainSearch.searchType.label + ':';
            if (scope.mainSearch.searchType.id === 'metatype') {
                scope.stringQuery += getMetatypeSelection('#searchMetatypeSelectAdvance');
            } else {
                scope.stringQuery += scope.mainSearch.searchText;
            }
            for (var i = 0; i < rowLength; i++) {
                scope.stringQuery += ' ' + scope.advanceSearchRows[i].operator.toUpperCase() + ' ' + scope.advanceSearchRows[i].searchType.label + ':';
                if (scope.advanceSearchRows[i].searchType.id === 'metatype') {
                    scope.stringQuery += getMetatypeSelection('#searchMetatypeSelect-' + i) + ')';
                } else {
                    scope.stringQuery += scope.advanceSearchRows[i].searchText + ')';
                }
            }
        };

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSearch#addAdvanceSearchRow
         * @methodOf mms.directives.directive:mmsSearch
         *
         * @description
         * Adds new row with empty fields and updates advanced search main query input
         */
        scope.addAdvanceSearchRow = function () {
            scope.advanceSearchRows.push({
                operator: 'And',
                searchType: {
                    id: 'all',
                    label: 'All Fields'
                },
                searchText: '',
                selectedSearchMetatypes: []
            });
            scope.stringQueryUpdate();
        };
        scope.addAdvanceSearchRow(); // Second row created by default

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSearch#removeRowAdvanceSearch
         * @methodOf mms.directives.directive:mmsSearch
         *
         * @description
         * Removes selected row and updates advanced search main query input
         *
         * @param {objecy} row advanced search row
         */
        scope.removeRowAdvanceSearch = function (row) {
            scope.advanceSearchRows = _.without(scope.advanceSearchRows, row);
            scope.stringQueryUpdate();
        };

        scope.modifyAdvanceSearch = function () {
            scope.advanceSearch = !scope.advanceSearch;
            scope.advancedSearchResults = !scope.advancedSearchResults;
        };

        scope.nextPage = function () {
            if (scope.paginationCache[scope.currentPage + 1]) {
                baseSearchResults = scope.paginationCache[scope.currentPage + 1];
                scope.currentPage += 1;
                _applyFilters();
            } else {
                scope.search(scope.mainSearch, scope.currentPage + 1, scope.itemsPerPage);
            }
            $anchorScroll('ve-search-results');

        };

        scope.prevPage = function () {
            if (scope.paginationCache[scope.currentPage - 1]) {
                baseSearchResults = scope.paginationCache[scope.currentPage - 1];
                scope.currentPage -= 1;
                _applyFilters();
            } else {
                scope.search(scope.mainSearch, scope.currentPage - 1, scope.itemsPerPage);
            }
        };

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSearch#search
         * @methodOf mms.directives.directive:mmsSearch
         *
         * @description
         * Call ElementService to make search post and get search results. Check for filterCallback
         * to further filter search results. Reassign pagination variables.
         *
         * @param {object} query search type and keyword from user input
         * @param {number} page page number of search results
         * @param {number} numItems number of items to return per page
         */
        scope.search = function (query, page, numItems) {
            scope.searchLoading = true;
            var queryOb = buildQuery(query);
            queryOb.from = page * numItems + page;
            queryOb.size = numItems;
            var reqOb = {
                projectId: scope.mmsProjectId,
                refId: scope.refId,
                checkType: true
            };
            ElementService.search(reqOb, queryOb, 2)
                .then(function (data) {
                    var elements = data.elements;
                    if (scope.mmsOptions.filterCallback) {
                        scope.searchResults = scope.mmsOptions.filterCallback(elements);
                        baseSearchResults = scope.searchResults;
                    } else {
                        scope.searchResults = elements;
                        baseSearchResults = elements;
                    }
                    //combineRelatedViews(scope);
                    scope.totalResults = data.total;
                    scope.maxPages = Math.ceil(scope.totalResults/scope.itemsPerPage);
                    scope.currentPage = page;
                    scope.paginationCache.push(scope.searchResults);
                    if (scope.advanceSearch) {
                        // scope.advanceSearch = !scope.advanceSearch;
                        scope.advancedSearchResults = true;
                    }
                    _applyFilters();
                    // scope.refineOptions = findRefineOptions(baseSearchResults);
                }, function (reason) {
                    growl.error("Search Error: " + reason.message);
                }).finally(function () {
                    scope.searchLoading = false;
                });
        };

        scope.newSearch = function (query) {
            scope.paginationCache = [];
            scope.search(query, 0, scope.itemsPerPage);
        };

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSearch#getProjectMountsQuery
         * @methodOf mms.directives.directive:mmsSearch
         *
         * @description
         * Create a JSON object that returns a term key with a list of all mounted
         * project ids within the current project.
         * 
         * Elastic format
         *
         * @return {object} Elastic query JSON object with list of project mounts
         */
        // var getProjectMountsQuery = function () {
        //     var projList = [];
        //     var projectTermsOb = {};

        //     var mountCacheKey = ['project-mounts', scope.mmsProjectId, scope.refId];
        //     if (CacheService.exists(mountCacheKey)) {
        //         projList = CacheService.get(mountCacheKey);
        //     } else {
        //         // Get project element data to gather mounted project list
        //         var cacheKey = ['project', scope.mmsProjectId, scope.refId];
        //         var cachedProj = CacheService.get(cacheKey);
        //         if (cachedProj) {
        //             getAllMountsAsArray(cachedProj, projList);
        //         } else {
        //             var project = {
        //                 'id': scope.mmsProjectId,
        //                 '_refId': scope.refId
        //             };
        //             getAllMountsAsArray(project, projList);
        //         }
        //         CacheService.put(mountCacheKey, projList, false);
        //     }

        //     // Create Elastic filter
        //     var q = {};
        //     q._projectId = projList;
        //     projectTermsOb.bool = {
        //         should: projList
        //     };
        //     return projectTermsOb;
        // };

        /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSearch#getAllMountsAsArray
         * @methodOf mms.directives.directive:mmsSearch
         *
         * @description
         * Use projectsList to populate list with all the mounted project ids for
         * specified project.
         *
         */
        var getAllMountsAsArray = function (project, projectsList) {
            projectsList.push({
                bool: {
                    must: [{
                        term: {
                            _projectId: project.id
                        }
                    }, {
                        term: {
                            _inRefIds: project._refId
                        }
                    }]
                }
            });
            var mounts = project._mounts;
            if (angular.isArray(mounts) && mounts.length !== 0) {
                for (var i = 0; i < mounts.length; i++) {
                    if (mounts[i]._mounts) {
                        getAllMountsAsArray(mounts[i], projectsList);
                    }
                }
            }
            return;
        };

        // var buildSearchClause = function (query) {
        //     var clause = {};
        //     var q = {};
        //     var valueSearchFields = ["defaultValue.value^3", "value.value^3", "specification.value^3"];
        //     if (query.searchType.id === 'all') {
        //         // Set query term for ID
        //         var idQuery = {};
        //         idQuery.term = {
        //             "id": {
        //                 "value": query.searchText,
        //                 "boost": 10.0
        //             }
        //         };

        //         // Set query for value,doc,name fields
        //         var allQuery = {};
        //         q.query = query.searchText;
        //         q.fields = valueSearchFields.slice();
        //         q.fields.push('name^5', 'documentation');
        //         q.fuzziness = 'AUTO';
        //         allQuery.multi_match = q;
        //         clause = {
        //             "bool": {
        //                 "should": [
        //                     idQuery,
        //                     allQuery
        //                 ]
        //             }
        //         };
        //     } else if (query.searchType.id === 'name' || query.searchType.id === 'documentation') {
        //         // "{"query":{"bool":{"must":[{"match":{"name":"val"}}]}}}"
        //         // "{"query":{"bool":{"must":[{"match":{"documentation":"val"}}]}}}"
        //         var type = query.searchType.id;
        //         q[type] = {
        //             query: query.searchText,
        //             fuzziness: 'AUTO'
        //         };
        //         clause.match = q;
        //     } else if (query.searchType.id === 'id') {
        //         // "{"query":{"bool":{"must":[{"term":{"id":"val"}}]}}}"
        //         clause.term = {
        //             "id": query.searchText
        //         };
        //     } else if (query.searchType.id === 'value') {
        //         // "{"query":{"bool":{"must":[{"multi_match":{"query":"val","fields":["defaultValue.value","value.value","specification.value"]}}]}}}"
        //         q.query = query.searchText;
        //         q.fields = valueSearchFields;
        //         q.fuzziness = 'AUTO';
        //         clause.multi_match = q;
        //     } else if (query.searchType.id === 'metatype') {
        //         var metatypeFilterList = _.pluck(query.selectedSearchMetatypes, 'id');

        //         // Get all _appliedStereotypeIds, which have `_`
        //         var appliedStereotypeFilter = [],
        //             typeFilter = [];
        //         for (var i = 0; i < metatypeFilterList.length; i++) {
        //             //if underscore = appliedsterortype otherwise 'type'
        //             if (metatypeFilterList[i].includes('_')) {
        //                 console.log(metatypeFilterList[i]);
        //                 appliedStereotypeFilter.push(metatypeFilterList[i]);
        //             } else {
        //                 typeFilter.push(metatypeFilterList[i]);
        //             }
        //         }
        //         // metatype clause
        //         clause = {
        //             "bool": {
        //                 "should": [{
        //                         "terms": {
        //                             "_appliedStereotypeIds": appliedStereotypeFilter
        //                         }
        //                     },
        //                     {
        //                         "terms": {
        //                             "type": typeFilter
        //                         }
        //                     }
        //                 ],
        //                 "minimum_should_match": 1
        //             }
        //         };
        //     }
        //     return clause;
        // };

         /**
         * @ngdoc function
         * @name mms.directives.directive:mmsSearch#buildQuery
         * @methodOf mms.directives.directive:mmsSearch
         *
         * @description
         * Build JSON object for Elastic query.
         *
         *
         * @return {object} Basic Search JSON.
         */
        var buildQuery = function (query) {
            var result = {
                "params": {}
            };
            var field = query.searchType.id;
            if(field == 'all') {
                field = '*';
            }
            result.params[field] = query.searchText;
            return result;
        };

        // /**
        //  * @ngdoc function
        //  * @name mms.directives.directive:mmsSearch#buildQuery
        //  * @methodOf mms.directives.directive:mmsSearch
        //  *
        //  * @description
        //  * Build JSON object for Elastic query.
        //  *
        //  *
        //  * @return {object} {{query: {bool: {must: *[]}}}} JSON object from post data.
        //  */
        // var buildQuery = function (query) {
        //     $window.alert(query);
        //     // Set project and mounted projects filter
        //     var projectTermsOb = getProjectMountsQuery();
        //     var filterList = [projectTermsOb];

        //     // Set custom filter options for query
        //     if (scope.mmsOptions.filterQueryList) {
        //         angular.forEach(scope.mmsOptions.filterQueryList, function (filterOb) {
        //             filterList.push(filterOb());
        //         });
        //     }

        //     // Set filter for all views and docs, if selected
        //     if (scope.docsviews.selected) {
        //         var viewsAndDocs = {
        //             terms: {
        //                 '_appliedStereotypeIds': [UtilsService.VIEW_SID, UtilsService.DOCUMENT_SID].concat(UtilsService.OTHER_VIEW_SID)
        //             }
        //         };
        //         filterList.push(viewsAndDocs);
        //     }
        //     filterList.push({
        //         "type": {
        //             "value": "element"
        //         }
        //     });

        //     // Set main query
        //     var mainBoolQuery = {};
        //     var jsonQueryOb = {};
        //     var rowLength = scope.advanceSearchRows.length;
        //     if (!scope.advanceSearch || rowLength === 0) {
        //         mainBoolQuery = buildSearchClause(query);
        //         mainBoolQuery = {
        //             "bool": {
        //                 "must": mainBoolQuery,
        //             }
        //         };
        //     } else {
        //         var clause2, clause1 = buildSearchClause(scope.mainSearch);
        //         for (var i = 0; i < rowLength; i++) {
        //             // if must, must_not or should
        //             var row = scope.advanceSearchRows[i];
        //             var operator = row.operator;
        //             clause2 = buildSearchClause(row);
        //             if (operator === "And") {
        //                 clause1 = {
        //                     "bool": {
        //                         "must": [clause1, clause2]
        //                     }
        //                 };
        //             } else if (operator === "Or") {
        //                 clause1 = {
        //                     "bool": {
        //                         "should": [clause1, clause2],
        //                         "minimum_should_match": 1
        //                     }
        //                 };
        //             } else if (operator === "And Not") {
        //                 clause1 = {
        //                     "bool": {
        //                         "must": [clause1, {
        //                             "bool": {
        //                                 "must_not": clause2
        //                             }
        //                         }]
        //                     }
        //                 };
        //             }
        //         }
        //         mainBoolQuery = clause1;
        //     }

        //     jsonQueryOb = {
        //         "sort": [
        //             "_score",
        //             {
        //                 "_modified": {
        //                     "order": "desc"
        //                 }
        //             }
        //         ],
        //         "query": {},
        //         "indices_boost" : [ {} ]
        //     };
        //     jsonQueryOb.query = mainBoolQuery;
        //     jsonQueryOb.query.bool.filter = filterList;
        //     jsonQueryOb.indices_boost[0][scope.mmsProjectId.toLowerCase()] = 2;
        //     jsonQueryOb.aggs = getAggs();
        //     return jsonQueryOb;
        // };

        // var getAggs = function () {
        //     return {
        //         "elements": {
        //             "filter": {
        //                 "bool": {
        //                     "must": [{
        //                             "term": {
        //                                 "_projectId": 'PROJECT-5d574aa8-bc06-4e95-bf71-3f2151833e09'
        //                             }
        //                         },
        //                         {
        //                             "term": {
        //                                 "_inRefIds": 'master'
        //                             }
        //                         }
        //                     ]
        //                 }
        //             },
        //             "aggs": {
        //                 "types": {
        //                     "terms": {
        //                         "field": "type",
        //                         "size": 20
        //                     }
        //                 }
        //             }
        //         }
        //     };
        // };

        // var combineRelatedViews = function(scope) {
        //     scope.searchResults.forEach(function(element) {
        //         var allRelatedDocuments = [];
        //         if (element._relatedDocuments) {
        //             element._relatedDocuments.forEach(function(relatedDoc) {
        //                 relatedDoc._parentViews.forEach(function(parentView) {
        //                     allRelatedDocuments.push({
        //                         relatedDocument: relatedDoc,
        //                         relatedView: parentView
        //                     });
        //                 });
        //             });
        //         }
        //         element.allRelatedDocuments = allRelatedDocuments;
        //         element.someRelatedDocuments = allRelatedDocuments.slice(0, 3);
        //     });
        // };

        // Set options
        if (scope.mmsOptions.searchResult) {
            var data1 = scope.mmsOptions.searchResult;
            scope.searchResults = data1;
            scope.paginationCache.push(data1);
        }
        if (scope.mmsOptions.searchInput) {
            scope.mainSearch.searchText = scope.mmsOptions.searchInput;
            scope.newSearch(scope.mainSearch);
        }
        if (scope.mmsOptions.itemsPerPage) {
            scope.itemsPerPage = scope.mmsOptions.itemsPerPage;
        }
        scope.emptyDocTxt = scope.mmsOptions.emptyDocTxt;
        scope.userResultClick = function (elem, property) {
            if (scope.mmsOptions.callback) {
                scope.mmsOptions.callback(elem, property);
            }
        };
        scope.userRelatedClick = function (event, doc, view, elem) {
            event.preventDefault();
            event.stopPropagation();
            if (scope.mmsOptions.relatedCallback)
                scope.mmsOptions.relatedCallback(doc, view, elem);
        };
    }

}
