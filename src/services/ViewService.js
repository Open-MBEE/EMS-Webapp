'use strict';

angular.module('mms')
.factory('ViewService', ['$q', '$http', '$rootScope','URLService', 'ElementService', 'UtilsService', 'CacheService', '_', ViewService]);

/**
 * @ngdoc service
 * @name mms.ViewService
 * @requires $q
 * @requires $http
 * @requires mms.URLService
 * @requires mms.ElementService
 * @requires mms.UtilsService
 * @requires mms.CacheService
 * @requires _
 * 
 * @description
 * Similar to the ElementService and proxies a lot of functions to it, this provides
 * CRUD for views and products/documents
 *
 * For View and Product json object schemas, see [here](https://ems.jpl.nasa.gov/alfresco/mms/raml/index.html)
 */
function ViewService($q, $http, $rootScope, URLService, ElementService, UtilsService, CacheService, _) {
    var currentViewId = '';
    var currentDocumentId = '';

    // The type of opaque element to the sysmlid of the classifier:
    var typeToClassifierId = {
        Image: "_17_0_5_1_407019f_1430628206190_469511_11978",
        List: "_17_0_5_1_407019f_1430628190151_363897_11927",
        Paragraph: "_17_0_5_1_407019f_1430628197332_560980_11953",
        Table: "_17_0_5_1_407019f_1430628178633_708586_11903",
        Section: "_17_0_5_1_407019f_1430628211976_255218_12002",
        ListT: "_17_0_5_1_407019f_1431903739087_549326_12013",
        TableT: "_17_0_5_1_407019f_1431903724067_825986_11992",
        Figure: "_17_0_5_1_407019f_1431903748021_2367_12034",  //manual images + timely, etc
        Equation: "_17_0_5_1_407019f_1431905053808_352752_11992",
        ParagraphT: "_17_0_5_1_407019f_1431903758416_800749_12055",
        SectionT: "_18_0_2_407019f_1435683487667_494971_14412"
    };

    function getClassifierIds() {
        var re = [];
        Object.keys(typeToClassifierId).forEach(function(key) {
            re.push(typeToClassifierId[key]);
        });
        return re;
    }

    var classifierIds = getClassifierIds();
    var opaqueClassifiers = [typeToClassifierId.Image, typeToClassifierId.List, 
        typeToClassifierId.Paragraph, typeToClassifierId.Section, typeToClassifierId.Table];
    
    var processString = function(values) {
        if (!values || values.length === 0 || values[0].type !== 'LiteralString')
            return '';
        return values[0].string;
    };
    var processStrings = function(values) {
        var res = [];
        if (!values || values.length === 0)
            return res;
        values.forEach(function(value) {
            if (value.type !== 'LiteralString' || !value.string)
                return;
            res.push(value.string);
        });
        return res;
    };
    var processPeople = function(values) {
        if (!values || values.length === 0)
            return [];
        var people = [];
        values.forEach(function(value) {
            if (value.type !== 'LiteralString' || !value.string)
                return;
            var p = value.string.split(',');
            if (p.length !== 5)
                return;
            people.push({
                firstname: p[0],
                lastname: p[1],
                title: p[2],
                orgname: p[3],
                orgnum: p[4]
            });
        });
        return people;
    };
    var processRevisions = function(values) {
        if (!values || values.length === 0)
            return [];
        var rev = [];
        values.forEach(function(value) {
            if (value.type !== 'LiteralString' || !value.string)
                return;
            var p = value.string.split('|');
            if (p.length !== 5)
                return;
            rev.push({
                revnum: p[0],
                date: p[1],
                firstname: p[2],
                lastname: p[3],
                remark: p[4]
            });
        });
        return rev;
    };
    var docMetadataTypes = {
        '_17_0_1_407019f_1326234342817_186479_2256': {
            name: 'header',
            process: processString
        },
        '_17_0_1_407019f_1326234349580_411867_2258': {
            name: 'footer',
            process: processString
        },
        '_17_0_2_3_f4a035d_1366647903710_685116_36989': {
            name: 'dnumber',
            process: processString
        },
        '_17_0_2_3_f4a035d_1366647903991_141146_36990': {
            name: 'version',
            process: processString
        },
        '_17_0_2_3_f4a035d_1366647903994_494629_36996': {
            name: 'titlelegal',
            process: processString
        },
        '_17_0_2_3_f4a035d_1366647903994_370992_36997': {
            name: 'footerlegal',
            process: processString
        },
        '_17_0_2_3_f4a035d_1366647903995_652492_37000': {
            name: 'authors',
            process: processPeople
        },
        '_17_0_2_3_f4a035d_1366647903996_970714_37001': {
            name: 'approvers',
            process: processPeople
        },
        '_17_0_2_3_f4a035d_1366647903996_463299_37002': {
            name: 'concurrences',
            process: processPeople
        },
        '_17_0_2_3_f4a035d_1366698987711_498852_36951': {
            name: 'revisions',
            process: processRevisions
        },
        '_17_0_2_3_f4a035d_1366696484320_980107_36953': {
            name: 'project',
            process: processString
        },
        '_17_0_2_3_f4a035d_1366647903995_864529_36998': {
            name: 'emails',
            process: processStrings
        },
        '_17_0_2_3_e9f034d_1375464775176_680884_29346': {
            name: 'instlogo',
            process: processString
        },
        '_17_0_2_3_e9f034d_1375464942934_241960_29357': {
            name: 'inst1',
            process: processString
        },
        '_17_0_2_3_e9f034d_1375464993159_319060_29362': {
            name: 'inst2',
            process: processString
        }
    };
    /**
     * @ngdoc method
     * @name mms.ViewService#getView
     * @methodOf mms.ViewService
     * 
     * @description
     * Gets a view object by id. 
     * 
     * @param {string} id The id of the view to get.
     * @param {boolean} [update=false] (optional) whether to always get the latest 
     *      from server, even if it's already in cache (this will update everywhere
     *      it's displayed, except for the editables)
     * @param {string} [workspace=master] (optional) workspace to use
     * @param {string} [version=latest] (optional) alfresco version number or timestamp
     * @returns {Promise} The promise will be resolved with the view object, 
     *      multiple calls to this method with the same id would result in 
     *      references to the same object.
     */
    var getView = function(id, update, workspace, version, weight) { 
        return ElementService.getElement(id, update, workspace, version, weight);
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#getViews
     * @methodOf mms.ViewService
     * 
     * @description
     * Same as getView, but for multiple ids.
     * 
     * @param {Array.<string>} ids The ids of the views to get.
     * @param {boolean} [update=false] (optional) whether to always get the latest 
     *      from server, even if it's already in cache (this will update everywhere
     *      it's displayed, except for the editables)
     * @param {string} [workspace=master] (optional) workspace to use
     * @param {string} [version=latest] (optional) alfresco version number or timestamp
     * @returns {Promise} The promise will be resolved with an array of view objects, 
     *      multiple calls to this method with the same ids would result in an array of 
     *      references to the same objects.
     */
    var getViews = function(ids, update, workspace, version, weight) {
        return ElementService.getElements(ids, update, workspace, version, weight);
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#getDocument
     * @methodOf mms.ViewService
     * 
     * @description
     * Gets a document object by id. 
     * 
     * @param {string} id The id of the document to get.
     * @param {boolean} [update=false] (optional) whether to always get the latest 
     *      from server, even if it's already in cache (this will update everywhere
     *      it's displayed, except for the editables)
     * @param {string} [workspace=master] (optional) workspace to use
     * @param {string} [version=latest] (optional) alfresco version number or timestamp
     * @returns {Promise} The promise will be resolved with the document object, 
     *      multiple calls to this method with the same id would result in 
     *      references to the same object.
     */
    var getDocument = function(id, update, workspace, version, weight) {
        return ElementService.getElement(id, update, workspace, version, weight);
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#updateView
     * @methodOf mms.ViewService
     * 
     * @description
     * Save view to alfresco and update the cache if successful, the view object
     * must have an id, and some updated properties. Use this to update view structure
     * or view to element reference caches.
     * 
     * @param {Object} view An object that contains view id and any changes to be saved.
     * @param {string} [workspace=master] (optional) workspace to use     
     * @returns {Promise} The promise will be resolved with the updated view
     */
    var updateView = function(view, workspace) {
        return ElementService.updateElement(view, workspace);
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#updateDocument
     * @methodOf mms.ViewService
     * 
     * @description
     * Save document to alfresco and update the cache if successful, the document object
     * must have an id, and some updated properties. Use this to update a document's
     * view hierarchy
     * 
     * @param {Object} document An object that contains doc id and any changes to be saved.
     * @param {string} [workspace=master] (optional) workspace to use
     * @returns {Promise} The promise will be resolved with the updated doc
     */
    var updateDocument = function(document, workspace) {
        return ElementService.updateElement(document, workspace);
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#downgradeDocument
     * @methodOf mms.ViewService
     * 
     * @description
     * Demote document to a view
     * 
     * @param {Object} document A document object
     * @param {string} [workspace=master] (optional) workspace to use
     * @param {string} [site] (optional) site id if present will remove doc from site docs list
     * @returns {Promise} The promise will be resolved with the downgraded view
     */
    var downgradeDocument = function(document, workspace, site) {
        var clone = {};
        clone.sysmlid = document.sysmlid;
        clone.specialization = {
            type: 'View', 
            contents: document.specialization.contents,
            contains: document.specialization.contains
        };
        return ElementService.updateElement(clone, workspace).then(
            function(data) {
                if (site) {
                    var ws = workspace;
                    if (!workspace)
                        ws = 'master';
                    var cacheKey = ['sites', ws, 'latest', site, 'products'];
                    var index = -1;
                    var found = false;
                    var sitedocs = CacheService.get(cacheKey);
                    if (sitedocs) {
                        for (index = 0; index < sitedocs.length; index++) {
                            if (sitedocs[index].sysmlid === document.sysmlid)
                                break;
                        }
                        if (index >= 0)
                            sitedocs.splice(index, 1);
                    }
                }
                return data;
            }, function(reason) {
                return reason;
            });
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#getViewElements
     * @methodOf mms.ViewService
     * 
     * @description
     * Gets the element objects for elements allowed in this view. The references are 
     * the same as ones gotten from ElementService.
     * 
     * @param {string} id The id of the view.
     * @param {boolean} [update=false] (optional) whether to always get the latest 
     *      from server, even if it's already in cache (this will update everywhere
     *      it's displayed, except for the editables)
     * @param {string} [workspace=master] (optional) workspace to use
     * @param {string} [version=latest] (optional) alfresco version number or timestamp
     * @returns {Promise} The promise will be resolved with array of element objects. 
     */
    var getViewElements = function(id, update, workspace, version, weight) {
        var n = normalize(update, workspace, version);
        var deferred = $q.defer();
        var url = URLService.getViewElementsURL(id, n.ws, n.ver);
        var cacheKey = ['views', n.ws, id, n.ver, 'elements'];
        if (CacheService.exists(cacheKey) && !n.update) 
            deferred.resolve(CacheService.get(cacheKey));
        else {
            ElementService.getGenericElements(url, 'elements', n.update, n.ws, n.ver, weight).
            then(function(data) {
                deferred.resolve(CacheService.put(cacheKey, data, false));
            }, function(reason) {
                deferred.reject(reason);
            });
        }
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#getDocumentViews
     * @methodOf mms.ViewService
     * 
     * @description
     * Gets the view objects for a document. The references are 
     * the same as ones gotten from ElementService.
     * 
     * @param {string} id The id of the document.
     * @param {boolean} [update=false] (optional) whether to always get the latest 
     *      from server, even if it's already in cache (this will update everywhere
     *      it's displayed, except for the editables)
     * @param {string} [workspace=master] (optional) workspace to use
     * @param {string} [version=latest] (optional) alfresco version number or timestamp
     * @param {boolean} [simple=false] (optional) whether to get simple views
     * @returns {Promise} The promise will be resolved with array of view objects. 
     */
    var getDocumentViews = function(id, update, workspace, version, simple, weight) {
        var n = normalize(update, workspace, version);
        var s = !simple ? false : simple; 
        var deferred = $q.defer();
        var url = URLService.getDocumentViewsURL(id, n.ws, n.ver, s);
        var cacheKey = ['products', n.ws, id, n.ver, 'views'];
        if (CacheService.exists(cacheKey) && !n.update) 
            deferred.resolve(CacheService.get(cacheKey));
        else {
            ElementService.getGenericElements(url, 'views', n.update, n.ws, n.ver, weight).
            then(function(data) {
                deferred.resolve(CacheService.put(cacheKey, data, false));
            }, function(reason) {
                deferred.reject(reason);
            });
        }
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#addViewToDocument
     * @methodOf mms.ViewService
     *
     * @description
     * This updates a document to include a new view, the new view must be a child
     * of an existing view in the document
     * 
     * @param {string} viewid Id of the view to add
     * @param {string} documentId Id of the document to add the view to
     * @param {string} parentViewId Id of the parent view, this view should 
     *      already be in the document
     * @param {string} [workspace=master] workspace to use
     * @param {Object} [viewOb=null] if present, adds to document views cache array
     * @returns {Promise} The promise would be resolved with updated document object
     */
    var addViewToDocument = function(viewId, documentId, parentViewId, workspace, viewOb) {
        var deferred = $q.defer();
        var ws = !workspace ? 'master' : workspace;
        var docViewsCacheKey = ['products', ws, documentId, 'latest', 'views'];
        getDocument(documentId, false, ws, null, 2)
        .then(function(data) {  
            var clone = {};
            clone.sysmlid = data.sysmlid;
            //clone.read = data.read;
            clone.specialization = _.cloneDeep(data.specialization);
            if (clone.specialization.contains)
                delete clone.specialization.contains;
            if (clone.specialization.contents)
                delete clone.specialization.contents;
            for (var i = 0; i < clone.specialization.view2view.length; i++) {
                if (clone.specialization.view2view[i].id === parentViewId) {
                    clone.specialization.view2view[i].childrenViews.push(viewId);
                    break;
                }
            } 
            clone.specialization.view2view.push({id: viewId, childrenViews: []});
            updateDocument(clone, ws)
            .then(function(data2) {
                if (CacheService.exists(docViewsCacheKey) && viewOb)
                    CacheService.get(docViewsCacheKey).push(viewOb);
                deferred.resolve(data2);
            }, function(reason) {
                /*if (reason.status === 409) {
                    clone.read = reason.data.elements[0].read;
                    clone.modified = reason.data.elements[0].modified;
                    updateDocument(clone, ws)
                    .then(function(data3) {
                        if (CacheService.exists(docViewsCacheKey) && viewOb)
                            CacheService.get(docViewsCacheKey).push(viewOb);
                        deferred.resolve(data3);
                    }, function(reason2) {
                        deferred.reject(reason2);
                    });
                } else
                    deferred.reject(reason);*/
                deferred.reject(reason);
            });
        }, function(reason) {
            deferred.reject(reason);
        });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#addElementToViewOrSection
     * @methodOf mms.ViewService
     *
     * @description
     * This updates a view or section to include a new element, the new element must be a child
     * of an existing element in the view
     * 
     * @param {string} viewOrSectionId Id of the View or Section to add the element to
     * @param {string} parentElementId Id of the parent element, this element should 
     *      already be in the document
     * @param {string} [workspace=master] workspace to use
     * @param {Object} elementOb the element object to add (for element ref tree this should be an instanceValue)
     * @returns {Promise} The promise would be resolved with updated document object
     */
    var addElementToViewOrSection = function(viewOrSectionId, parentElementId, workspace, elementOb) {

        var deferred = $q.defer();
        var ws = !workspace ? 'master' : workspace;
        ElementService.getElement(viewOrSectionId, false, ws, null, 2)
        .then(function(data) {  
            var clone = {};
            clone.sysmlid = data.sysmlid;
            clone.read = data.read;
            clone.modified = data.modified;
            clone.specialization = _.cloneDeep(data.specialization);

            var key;
            if (isSection(data)) {
                key = "instanceSpecificationSpecification";
            }
            else {
                if (clone.specialization.contains)
                    delete clone.specialization.contains;
                key = "contents";
            }

           if (!clone.specialization[key]) {
                clone.specialization[key] = {
                    operand: [],
                    type: "Expression",
                    valueExpression: null
                };
            }
            clone.specialization[key].operand.push(elementOb);

            // TODO add to parentElement also if needed 
            ElementService.updateElement(clone, ws)
            .then(function(data2) {
                deferred.resolve(data2);
            }, function(reason) {
                deferred.reject(reason);
            });
        }, function(reason) {
            deferred.reject(reason);
        });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#deleteElementFromViewOrSection
     * @methodOf mms.ViewService
     *
     * @description
     * This deletes the specified instanceVal from the contents of the View or Section
     * 
     * @param {string} viewOrSecId Id of the View or Section to delete the element from
     * @param {string} [workspace=master] workspace to use
     * @param {string} instanceVal to remove from the View or Section
     * @returns {Promise} The promise would be resolved with updated View or Section object
     */
    var deleteElementFromViewOrSection = function(viewOrSecId, workspace, instanceVal) {

        var deferred = $q.defer();

        if (instanceVal) {
            var ws = !workspace ? 'master' : workspace;
            ElementService.getElement(viewOrSecId, false, ws, null, 2)
            .then(function(data) {  
                var clone = {};
                clone.sysmlid = data.sysmlid;
                clone.read = data.read;
                clone.modified = data.modified;
                clone.specialization = _.cloneDeep(data.specialization);

                var key;
                if (isSection(data)) {
                    key = "instanceSpecificationSpecification";
                }
                else {
                    if (clone.specialization.contains)
                        delete clone.specialization.contains;
                    key = "contents";
                }

                if (clone.specialization[key] && clone.specialization[key].operand) {
                    var operands = data.specialization[key].operand;
                    //var index = operands.indexOf(instanceVal);
                    //if (index >= 0)
                    //    operands.splice(index, 1); 
                    for (var i = 0; i < operands.length; i++) {
                        if (instanceVal.instance === operands[i].instance) {
                            clone.specialization[key].operand.splice(i,1);
                            break; 
                        }
                    }
                }
                
                // Note:  We decided we do not need to delete the instanceVal, just remove from
                //         contents.

                ElementService.updateElement(clone, ws)
                .then(function(data2) {
                    deferred.resolve(data2);
                }, function(reason) {
                    deferred.reject(reason);
                });
            }, function(reason) {
                deferred.reject(reason);
            });
        }
        return deferred.promise;
    };

    /**
     * Creates and adds a opaque presentation element to the passed view or section if addToView is true,
     * otherwise, just creates the opaque element but doesnt add it the
     * view or section
     *
     * @param {object} viewOrSection The View or Section to add to
     * @param {string} [workspace=master] workspace to use
     * @param {string} addToView true if wanting to add the element to the view
     * @param {string} elementType The type of element that is to be created, ie 'Paragraph'
     * @param {string} [site=null] (optional) site to post to
     * @param {string} [name=Untitled <elementType>] (optional) InstanceSpecification name to use
     * @returns {Promise} The promise would be resolved with updated View object if addToView is true
     *                    otherwise the created InstanceSpecification
    */
    var createAndAddElement = function(viewOrSection, workspace, addToView, elementType, site, name) {

        var deferred = $q.defer();
        var defaultName = "Untitled "+elementType;
        var instanceSpecName = name ? name : defaultName;

        addInstanceSpecification(viewOrSection, workspace, elementType, addToView, site, instanceSpecName).
        then(function(data) {
            deferred.resolve(data);
        }, function(reason) {
            deferred.reject(reason);
        });

        return deferred.promise;
    };

    /**
     * Adds a InstanceVal/InstanceSpecification to the contents of the View
     *
     * @param {object} viewOrSection The View or Section to add to
     * @param {string} [workspace=master] workspace to use
     * @param {string} type The type of element that is to be created, ie 'Paragraph'
     * @param {string} addToView true if wanting to add the element to the view
     * @param {string} [site=null] (optional) site to post to
     * @param {string} [name=Untitled <elementType>] (optional) InstanceSpecification name to use
     * @param {string} [json=null] (optional) Json blob for the presentation element
     * @returns {Promise} The promise would be resolved with updated View object if addToView is true
     *                    otherwise the created InstanceSpecification
    */
    var addInstanceSpecification = function(viewOrSection, workspace, type, addToView, site, name, json, viewDoc) {

        var deferred = $q.defer();
        var instanceSpecName = name ? name : "Untitled InstanceSpec";
        var presentationElem = {};
        var splitArray = viewOrSection.qualifiedId.split('/');
        var projectId = null;

        if (splitArray && splitArray.length > 2)
            projectId = splitArray[2];

        var processInstanceSpec = function(createdInstanceSpecUpdate) {

            if (addToView) {
                addInstanceVal(viewOrSection, workspace, createdInstanceSpecUpdate.sysmlid).then(function(updatedView) {
                    if (type === "Section") {
                        // Broadcast message to TreeCtrl:
                        $rootScope.$broadcast('viewctrl.add.section', createdInstanceSpecUpdate, viewOrSection);
                    }
                    deferred.resolve(updatedView);
                }, function(reason) {
                    deferred.reject(reason);
                });
            }
            else {
                deferred.resolve(createdInstanceSpecUpdate);
            }
        };

        var createPresentationElem = function(createdInstanceSpec) {

            // Have it reference the InstanceSpec so we dont need to create extra elements:
            var paragraph = {
                sourceType: "reference",
                source: createdInstanceSpec.sysmlid,
                sourceProperty: "documentation",
                type: "Paragraph"
            };

            var jsonBlob = {};
            if (type === "Paragraph") {
                jsonBlob = paragraph;
            }
            else if (type === "List") {
                jsonBlob = paragraph;
                jsonBlob.type = 'ListT';
            }
            else if (type === "Table") {
                jsonBlob = paragraph;
                jsonBlob.type = 'TableT';
            }
            else if (type === "Figure") {
                jsonBlob = paragraph;
                jsonBlob.type = 'Figure';
            }
            else if (type === "Section") {
                jsonBlob = {
                    operand:[],  
                    type:"Expression"
                };
            }
            else if (type === "Equation") {
                jsonBlob = paragraph;
                jsonBlob.type = 'Equation';
            }
            else if (type === 'Comment') {
                jsonBlob = paragraph;
                jsonBlob.type = 'Comment';
            }
            // Special case for Section.  Doesnt use json blobs.
            if (type === "Section") {
                presentationElem = jsonBlob;  
            }
            else {
                presentationElem = {
                    string:JSON.stringify(jsonBlob),
                    type:"LiteralString"
                };
            }
        };

        if (json) {
            presentationElem.string = JSON.stringify(json);
            presentationElem.type = "LiteralString";
        }
        var realType = type;
        if (type === 'Table')
            realType = 'TableT';
        if (type === 'List')
            realType = 'ListT';
        if (type === 'Paragraph')
            realType = 'ParagraphT';
        if (type === 'Section')
            realType = 'SectionT';
        if (type === 'Comment')
            realType = 'ParagraphT';
        var documentation = '';
        if (viewDoc) {
            documentation = '<p>&nbsp;</p><p><mms-transclude-doc data-mms-eid="' + viewOrSection.sysmlid + '">[cf:' + viewOrSection.name + '.doc]</mms-transclude-doc></p><p>&nbsp;</p>';
        }
        var instanceSpec = {
            name:instanceSpecName,
            documentation: documentation,
            specialization: {
                type:"InstanceSpecification",
                classifier:[typeToClassifierId[realType]],
                instanceSpecificationSpecification: presentationElem
            },
            appliedMetatypes: ["_9_0_62a020a_1105704885251_933969_7897"],
            isMetatype: false
        };

        var createInstanceSpecElement = function() {
        ElementService.createElement(instanceSpec, workspace, site).then(function(createdInstanceSpec) {

            // Add in the presentation element:
            if (json) {
                processInstanceSpec(createdInstanceSpec);
            }
            else {
                createPresentationElem(createdInstanceSpec);
                createdInstanceSpec.specialization.instanceSpecificationSpecification = presentationElem;

                ElementService.updateElement(createdInstanceSpec, workspace).then(function(createdInstanceSpecUpdate) {
                    processInstanceSpec(createdInstanceSpecUpdate);
                }, function(reason) {
                    deferred.reject(reason);
                });
            }
        }, function(reason) {
            deferred.reject(reason);
        });
        };

        if (projectId) {
            if (projectId.indexOf('PROJECT') >= 0) {
                var viewInstancePackage = {
                    sysmlid: projectId.replace('PROJECT', 'View_Instances'), 
                    name: 'View Instances', 
                    owner: projectId,
                    specialization: {type: 'Package'}
                };
                ElementService.updateElement(viewInstancePackage, workspace)
                .then(function() {
                    projectId = projectId.replace('PROJECT', 'View_Instances');
                    instanceSpec.owner = projectId;
                    createInstanceSpecElement();
                }, function(reason) {
                    instanceSpec.owner = projectId;
                    createInstanceSpecElement();
                });
            } else {
                instanceSpec.owner = projectId;
                createInstanceSpecElement();
            }
        } else {
            createInstanceSpecElement();
        }
        return deferred.promise;
    };

    /**
     * Adds a InstanceValue to the contents of the View
     *
     * @param {object} viewOrSection The View or Section to add to
     * @param {string} [workspace=master] workspace to use
     * @param {string} instanceSpecId InstanceSpecification sysmlid.  This is the instance
     #                 for the InstanceValue.
     * @returns {Promise} The promise would be resolved with updated View object
    */
    var addInstanceVal = function(viewOrSection, workspace, instanceSpecId) {

        var instanceVal = {
            instance:instanceSpecId,
            type:"InstanceValue",
            valueExpression: null
        };

        return addElementToViewOrSection(viewOrSection.sysmlid, viewOrSection.sysmlid, workspace, instanceVal);
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#createView
     * @methodOf mms.ViewService
     * 
     * @description
     * Create a new view, owner must be specified (parent view), id cannot be specified,
     * if name isn't specified, "Untitled" will be used, a default contents with 
     * paragraph of the view documentation will be used. If a document is specified, 
     * will also add the view to the document, in this case the parent view should 
     * already be in the document. The new view will be added as the last child of the 
     * parent view.
     * 
     * @param {string} ownerId Id of the parent view
     * @param {string} [name=Untitled] name for the view
     * @param {string} [documentId] optional document to add to
     * @param {string} [workspace=master] workspace to use 
     * @param {string} [viewId] optional sysmlid to be used for the view
     * @param {string} [viewDoc] optional documentation to be used for the view
     * @param {string} [site] site to create under
     * @returns {Promise} The promise will be resolved with the new view. 
     */
    var createView = function(ownerId, name, documentId, workspace, viewId, viewDoc, site) {
        var deferred = $q.defer();
        var view = {
            specialization: {
                type: 'View',
                allowedElements: [],
                displayedElements: [],
                childrenViews: [],
                contents: {
                    valueExpression: null,
                    operand: [],
                    type: 'Expression'
                }
            },
            owner: ownerId,
            name: !name ? 'Untitled View' : name,
            documentation: '',
            appliedMetatypes: [
                "_17_0_1_232f03dc_1325612611695_581988_21583",
                "_9_0_62a020a_1105704885343_144138_7929"
            ],
            isMetatype: false
        };
        if (viewId) view.sysmlid = viewId;
        if (viewDoc) view.documentation = viewDoc;

        ElementService.createElement(view, workspace, site)
        .then(function(data) {
            
            data.specialization.allowedElements = [];
            data.specialization.displayedElements = [data.sysmlid];
            data.specialization.childrenViews = [];

            var jsonBlob = {
                'type': 'Paragraph', 
                'sourceType': 'reference', 
                'source': data.sysmlid, 
                'sourceProperty': 'documentation'
            };
            addInstanceSpecification(data, workspace, "Paragraph", true, null, "View Documentation", null, true)
            .then(function(data2) {
                if (documentId) {
                    addViewToDocument(data.sysmlid, documentId, ownerId, workspace, data2)
                    .then(function(data3) {
                        deferred.resolve(data2);
                    }, function(reason) {
                        deferred.reject(reason);
                    });
                } else
                    deferred.resolve(data2);
            }, function(reason) {
                deferred.reject(reason);
            });
        }, function(reason) {
            deferred.reject(reason);
        });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#createDocument
     * @methodOf mms.ViewService
     * 
     * @description
     * Create a new document,
     * if name isn't specified, "Untitled" will be used, a default contents with 
     * paragraph of the view documentation will be used. 
     * 
     * @param {string} [name=Untitled] name for the Document
     * @param {string} [site] site name
     * @param {string} [workspace=master] workspace to use 
     * @returns {Promise} The promise will be resolved with the new view. 
     */
    var createDocument = function(name, site, workspace) {
        var deferred = $q.defer();
        var doc = {
            specialization: {
                type: "Product", 
                allowedElements: [],
                displayedElements: [],
                contents: {
                    valueExpression: null,
                    operand: [],
                    type: 'Expression'
                }
            },
            name: !name ? 'Untitled Document' : name,
            documentation: '',
            appliedMetatypes: [
                "_17_0_2_3_87b0275_1371477871400_792964_43374",
                "_9_0_62a020a_1105704885343_144138_7929"
            ],
            isMetatype: false
        };
        ElementService.createElement(doc, workspace, site)
        .then(function(data) {
            data.specialization.displayedElements = [data.sysmlid];
            data.specialization.view2view = [
                {
                    id: data.sysmlid,
                    childrenViews: []
                }
            ];
            //ElementService.updateElement(data, workspace)
            
            var jsonBlob = {
                'type': 'Paragraph', 
                'sourceType': 'reference', 
                'source': data.sysmlid, 
                'sourceProperty': 'documentation'
            };
            addInstanceSpecification(data, workspace, "Paragraph", true, site, "View Documentation", null, true) 
            .then(function(data2) {
                var ws = !workspace ? 'master' : workspace;
                var cacheKey = ['sites', ws, 'latest', site, 'products'];
                if (CacheService.exists(cacheKey))
                    CacheService.get(cacheKey).push(data2);
                deferred.resolve(data2);
            }, function(reason) {
                deferred.reject(reason);
            });
        }, function(reason) {
            deferred.reject(reason);
        });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#getSiteDocuments
     * @methodOf mms.ViewService
     * 
     * @description
     * Gets all the documents in a site
     * 
     * @param {string} site Site name
     * @param {boolean} [update=false] Update latest
     * @param {string} [workspace=master] workspace to use 
     * @param {string} [version=latest] timestamp
     * @returns {Promise} The promise will be resolved with array of document objects 
     */
    var getSiteDocuments = function(site, update, workspace, version, weight) {
        var n = normalize(update, workspace, version);
        var deferred = $q.defer();
        var url = URLService.getSiteProductsURL(site, n.ws, n.ver);
        var cacheKey = ['sites', n.ws, n.ver, site, 'products'];
        if (CacheService.exists(cacheKey) && !n.update) 
            deferred.resolve(CacheService.get(cacheKey));
        else {
            ElementService.getGenericElements(url, 'products', n.update, n.ws, n.ver, weight).
            then(function(data) {              
                deferred.resolve(CacheService.put(cacheKey, data, false));
            }, function(reason) {
                deferred.reject(reason);
            });
        }
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#parseExprRefTree
     * @methodOf mms.ViewService
     * 
     * @description
     * Parses a InstanceValue node of the expression reference tree in the contents
     * of a View, and returns the corresponding presentation element json object.
     * 
     * @param {object} instanceVal instance value object
     * @param {string} [workspace=master] workspace
     * @param {string} [version=latest] timestamp
     * @returns {Promise} The promise will be resolved with a json object for the 
     *                    corresponding presentation element
     */
    var parseExprRefTree = function(instanceVal, workspace, version, weight) {

        var instanceSpecId = instanceVal.instance;
        var deferred = $q.defer();

        // TODO do we need version?
        ElementService.getElement(instanceSpecId, false, workspace, version, weight)
        .then(function(instanceSpec) {

            // InstanceSpecifcations can have instanceSpecificationSpecification 
            // for opaque presentation elements, or slots:

            var instanceSpecSpec = instanceSpec.specialization.instanceSpecificationSpecification;
            var type = instanceSpecSpec.type;

            // If it is a Opaque List, Paragraph, Table, Image, List:
            if (type === 'LiteralString') {
                var jsonString = instanceSpecSpec.string;
                deferred.resolve(JSON.parse(jsonString)); 
            }
            // If it is a Opaque Section, or a Expression:
            else if (type === 'Expression') {
                // If it is a Opaque Section then we want the instanceSpec:
                if (isSection(instanceSpec)) {
                    instanceSpec.type = "Section";
                    deferred.resolve(instanceSpec);
                }
                // Will we ever have an Expression otherwise?
                else {
                    deferred.resolve(instanceSpecSpec);
                }
            }

            // If it is a non-Opaque presentation element:
            if (instanceSpec.slots) {
                // TODO
            }        
        }, function(reason) {
            deferred.reject(reason);
        });

        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#getElementReferenceTree
     * @methodOf mms.ViewService
     * 
     * @description
     * gets the presentation element tree as an array of tree nodes
     * a tree node is this:
     * <pre>
        {
            instance: id of the instance,
            instanceVal: instanceValue object,
            sectionElements: array of child tree nodes,
            instanceSpecification: instance specification object of the instance,
            presentationElement: json of the presentation element or a section instance spec with type = Section
        }
     * </pre>
     * 
     * @param {object} contents an expression object from a view or section
     * @param {string} [workspace=master] workspace
     * @param {string} [version=latest] timestamp
     * @returns {Promise} The promise will be resolved with array of tree node objects
     */
    var getElementReferenceTree = function (contents, workspace, version, weight) {
        var promises = [];
        angular.forEach(contents.operand, function(instanceVal) {
            promises.push( getElementReference(instanceVal, workspace, version, weight) );
        });
        return $q.all(promises);
    };

    var getElementReference = function (instanceVal, workspace, version, weight) {
        var deferred = $q.defer();

        var elementObject = {};

        elementObject.instance = instanceVal.instance;
        elementObject.instanceVal = instanceVal;
        elementObject.sectionElements = [];

        getInstanceSpecification(instanceVal, workspace, version, weight)
        .then(function(instanceSpecification) {
            elementObject.instanceSpecification = instanceSpecification;
            if (instanceSpecification.specialization && instanceSpecification.specialization.classifier &&
                    instanceSpecification.specialization.classifier.length > 0 && 
                    opaqueClassifiers.indexOf(instanceSpecification.specialization.classifier[0]) >= 0)
                elementObject.isOpaque = true;
            else
                elementObject.isOpaque = false;
            parseExprRefTree(instanceVal, workspace, version, weight)
            .then(function(presentationElement) {
                elementObject.presentationElement = presentationElement;
                if (presentationElement.type === 'Section') {
                    getElementReferenceTree(presentationElement.specialization.instanceSpecificationSpecification, workspace, version)
                    .then(function(sectionElementReferenceTree) {
                        elementObject.sectionElements = sectionElementReferenceTree;
                        deferred.resolve(elementObject);
                    }, function(reason) {
                        deferred.reject(reason);
                    });
                } else
                    deferred.resolve(elementObject);
            }, function(reason) {
                deferred.reject(reason); //this should never happen
            });
        }, function(reason) {
            deferred.reject(reason);
        });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#getInstanceSpecification
     * @methodOf mms.ViewService
     * 
     * @description
     * Parses a InstanceValue node of the expression reference tree in the contents
     * of a View, and returns the corresponding instance specification
     * 
     * @param {object} instanceVal instance value object
     * @param {string} [workspace=master] workspace
     * @param {string} [version=latest] timestamp
     * @returns {Promise} The promise will be resolved with a json object for the 
     *                    corresponding presentation element
     */
    var getInstanceSpecification = function(instanceVal, workspace, version, weight) {

        var instanceSpecId = instanceVal.instance;
        var deferred = $q.defer();

        ElementService.getElement(instanceSpecId, false, workspace, version, weight)
        .then(function(instanceSpec) {
            deferred.resolve(instanceSpec);
        }, function(reason) {
            deferred.reject(reason);
        });

        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#isSection
     * @methodOf mms.ViewService
     * 
     * @description
     * Returns true if the passed InstanceSpecification is a Section
     * 
     * @param {Object} instanceSpec A InstanceSpecification json object
     * @returns {boolean} whether it's a section
     */
    var isSection = function(instanceSpec) {
        return instanceSpec.specialization && instanceSpec.specialization.classifier && 
               instanceSpec.specialization.classifier.length > 0 &&
               (instanceSpec.specialization.classifier[0] === typeToClassifierId.Section ||
                instanceSpec.specialization.classifier[0] === typeToClassifierId.SectionT);
    };

    //TODO remove
    var setCurrentViewId = function(id) {
        currentViewId = id;
    };

    var setCurrentDocumentId = function(id) {
        currentDocumentId = id;
    };

    var getCurrentViewId = function() {
        return currentViewId;
    };

    var getCurrentDocumentId = function() {
        return currentDocumentId;
    };

    var normalize = function(update, workspace, version) {
        return UtilsService.normalize({update: update, workspace: workspace, version: version});
    };

    var getDocMetadata = function(docid, ws, version, weight) {
        var deferred = $q.defer();
        var metadata = {};
        ElementService.search(docid, ['id'], null, null, ws, weight)
        .then(function(data) {
            if (data.length === 0 || data[0].sysmlid !== docid || !data[0].properties) {
                return;
            }
            data[0].properties.forEach(function(prop) {
                var feature = prop.specialization ? prop.specialization.propertyType : null;
                var value = prop.specialization ? prop.specialization.value : null;
                if (!feature || !docMetadataTypes[feature] || !value || value.length === 0)
                    return;
                metadata[docMetadataTypes[feature].name] = docMetadataTypes[feature].process(value);
            });
        }, function(reason) {
        }).finally(function() {
            deferred.resolve(metadata);
        });
        return deferred.promise;
    };

    var isPresentationElement = function(e) {
        if (e.specialization && e.specialization.type === 'InstanceSpecification') {
            var classifiers = e.specialization.classifier;
            if (classifiers.length > 0 && classifierIds.indexOf(classifiers[0]) >= 0)
                return true;
        }
        return false;
    };

    return {
        getView: getView,
        getViews: getViews,
        getDocument: getDocument,
        updateView: updateView,
        updateDocument: updateDocument,
        getViewElements: getViewElements,
        createView: createView,
        createDocument: createDocument,
        downgradeDocument: downgradeDocument,
        addViewToDocument: addViewToDocument,
        getDocumentViews: getDocumentViews,
        getSiteDocuments: getSiteDocuments,
        setCurrentViewId: setCurrentViewId,
        setCurrentDocumentId: setCurrentDocumentId,
        getCurrentViewId: getCurrentViewId,
        getCurrentDocumentId: getCurrentDocumentId,
        parseExprRefTree: parseExprRefTree,
        isSection: isSection,
        isPresentationElement: isPresentationElement,
        addElementToViewOrSection: addElementToViewOrSection,
        createAndAddElement: createAndAddElement,
        addInstanceVal: addInstanceVal,
        deleteElementFromViewOrSection: deleteElementFromViewOrSection,
        addInstanceSpecification: addInstanceSpecification,
        typeToClassifierId: typeToClassifierId,
        getInstanceSpecification : getInstanceSpecification,
        getElementReferenceTree : getElementReferenceTree,
        getDocMetadata: getDocMetadata
    };

}