'use strict';

angular.module('mms')
.factory('ViewService', ['$q', '$http', '$rootScope', 'URLService', 'ElementService', 'UtilsService', 'CacheService', '_', ViewService]);

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
 * CRUD for views and products/documents/group
 *
 */
function ViewService($q, $http, $rootScope, URLService, ElementService, UtilsService, CacheService, _) {
    var inProgress = {}; //only used for view elements over limit

    // The type of opaque element to the sysmlId of the classifierIds:
    var TYPE_TO_CLASSIFIER_ID = {
        Image: "_17_0_5_1_407019f_1430628206190_469511_11978",
        List: "_17_0_5_1_407019f_1430628190151_363897_11927",
        Paragraph: "_17_0_5_1_407019f_1430628197332_560980_11953",
        Table: "_17_0_5_1_407019f_1430628178633_708586_11903",
        Section: "_17_0_5_1_407019f_1430628211976_255218_12002",
        ListT: "_17_0_5_1_407019f_1431903739087_549326_12013",
        TableT: "_17_0_5_1_407019f_1431903724067_825986_11992",
        ImageT: "_17_0_5_1_407019f_1431903748021_2367_12034", //manual images + timely, etc
        Equation: "_17_0_5_1_407019f_1431905053808_352752_11992",
        ParagraphT: "_17_0_5_1_407019f_1431903758416_800749_12055",
        SectionT: "_18_0_2_407019f_1435683487667_494971_14412",
        TomSawyerDiagram: "_18_5_2_8bf0285_1506035630029_725905_15942",
        Figure: "_18_5_2_8bf0285_1506035630979_342273_15944",
        FigureT: "_18_5_2_8bf0285_1506035630029_725905_15942"
    };

    var AnnotationType = {
        mmsTranscludeName: 1,
        mmsTranscludeDoc: 2,
        mmsTranscludeCom: 3,
        mmsTranscludeVal: 4,
        mmsViewLink: 5,
        mmsPresentationElement: 6
    };

    var GROUP_ST_ID = '_18_5_3_8bf0285_1520469040211_2821_15754';

    // function getClassifierIds() {
    //     var re = [];
    //     Object.keys(TYPE_TO_CLASSIFIER_ID).forEach(function(key) {
    //         re.push(TYPE_TO_CLASSIFIER_ID[key]);
    //     });
    //     return re;
    // }

    var TYPE_TO_CLASSIFIER_TYPE = {
        Table: 'TableT',
        Paragraph: 'ParagraphT',
        Section: 'SectionT',
        Comment: 'ParagraphT',
        List: 'ListT',
        Image: 'ImageT',
        Equation: 'Equation',
        TomSawyerDiagram: 'TomSawyerDiagram'
    };

    // var classifierIdsIds = getClassifierIds();
    var opaqueClassifiers = [TYPE_TO_CLASSIFIER_ID.Image, TYPE_TO_CLASSIFIER_ID.List, 
        TYPE_TO_CLASSIFIER_ID.Paragraph, TYPE_TO_CLASSIFIER_ID.Section, TYPE_TO_CLASSIFIER_ID.Table, TYPE_TO_CLASSIFIER_ID.Figure];

    /**
     * @ngdoc method
     * @name mms.ViewService#downgradeDocument
     * @methodOf mms.ViewService
     * 
     * @description
     * Demote document to a view and update the applied stereotype instance
     * 
     * @param {Object} elementOb A document object
     * @returns {Promise} The promise will be resolved with the downgraded view
     */
    var downgradeDocument = function(elementOb) {
        var clone = JSON.parse(JSON.stringify(elementOb));
        clone._appliedStereotypeIds = [UtilsService.VIEW_SID];
        var asi = {
            id: elementOb.id + "_asi",
            ownerId: elementOb.id,
            classifierIds: [UtilsService.VIEW_SID],
            type: "InstanceSpecification",
            _projectId: elementOb._projectId,
            _refId: elementOb._refId,
            stereotypedElementId: elementOb.id
        };
        return ElementService.updateElements([clone, asi])
            .then(function(data) {
                var cacheKey = ['documents', elementOb._projectId, elementOb._refId];
                var index = -1;
                var projectDocs = CacheService.get(cacheKey);
                if (projectDocs) {
                    for (var i = 0; i < projectDocs.length; i++) {
                        if (projectDocs[i].id === elementOb.id) {
                            index = i;
                            break;
                        }
                    }
                    if (index >= 0) {
                        projectDocs.splice(index, 1);
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
     * @param {object} reqOb see description at ElementService.getElement, where elementId is id of the view
     * @param {integer} weight the priority of the request
     * @param {boolean} [update=false] (optional) whether to always get the latest 
     *      from server, even if it's already in cache (this will update everywhere
     *      it's displayed, except for the editables)
     * @returns {Promise} The promise will be resolved with array of element objects. 
     */
    var getViewElements = function(reqOb, weight, update) {
        UtilsService.normalize(reqOb);
        var deferred = $q.defer();
        var key = 'viewElements' + reqOb.projectId + reqOb.refId + reqOb.elementId + reqOb.commitId;
        if (inProgress[key]) {
            return inProgress[key];
        }
        var requestCacheKey = ['elements', reqOb.projectId, reqOb.refId, reqOb.elementId, reqOb.commitId];
        var cached = CacheService.get(requestCacheKey);
        if (cached && !update) {
            deferred.resolve(cached);
            return deferred.promise;
        }
        inProgress[key] = deferred.promise;
        ElementService.getElement(reqOb, weight, update)
        .then(function(view) {
            var toGet = [];
            var results = [];
            if (view._displayedElementIds) {
                var displayed = view._displayedElementIds;
                if (!angular.isArray(displayed)) {
                    displayed = JSON.parse(displayed);
                }
                if (angular.isArray(displayed) && displayed.length > 0) {
                    toGet = displayed;
                }
            }
            if (view._contents && view._contents.operand) {
                var contents = view._contents.operand;
                for (var i = 0; i < contents.length; i++) {
                    if (contents[i] && contents[i].instanceId) {
                        toGet.push(contents[i].instanceId);
                    }
                }
            }
            if (view.specification && view.specification.operand) {
                var specContents = view.specification.operand;
                for (var j = 0; j < specContents.length; j++) {
                    if (specContents[j] && specContents[j].instanceId) {
                        toGet.push(specContents[j].instanceId);
                    }
                }
            }
            if (isTable(view) && view.specification && view.specification.value) {
                try {
                    var tableJson = JSON.parse(view.specification.value);
                    if (tableJson.body) {
                        collectTableSources(toGet, tableJson.body);
                    }
                } catch (e) {
                }
            }
            
            var toGetSet = new Set(toGet);
            reqOb.elementIds = Array.from(toGetSet);
            ElementService.getElements(reqOb, weight, update)
            .then(function(data) {
                results = data;
            }).finally(function() {
                CacheService.put(requestCacheKey, results);
                deferred.resolve(results);
                delete inProgress[key];
            });
            
            
        }, function(reason) {
            deferred.reject(reason);
            delete inProgress[key];
        });
        return deferred.promise;
    };

    var collectTableSources = function(sources, body) {
        var i, j, k;
        for (i = 0; i < body.length; i++) {
            var row = body[i];
            for (j = 0; j < row.length; j++) {
                var cell = row[j];
                for (k = 0; k < cell.content.length; k++) {
                    var thing = cell.content[k];
                    if (thing.type === 'Table' && thing.body) {
                        collectTableSources(sources, thing.body);
                    } else if (thing.type === 'Paragraph' && thing.source) {
                        sources.push(thing.source);
                    }
                }
            }
        }
    };
    
    /**
     * @ngdoc method
     * @name mms.ViewService#addViewToParentView
     * @methodOf mms.ViewService
     *
     * @description
     * This updates a document to include a new view, the new view must be a child
     * of an existing view in the document
     * 
     * @param {object} reqOb see Element.getElement for description, use parentViewId 
     *                  and viewId instead of elementId, add 'aggr' key
     * @returns {Promise} The promise would be resolved with updated parent view object
     */
    var addViewToParentView = function(reqOb) {
        UtilsService.normalize(reqOb);
        var deferred = $q.defer();
        ElementService.getElement({
            projectId: reqOb.projectId,
            refId: reqOb.refId,
            elementId: reqOb.parentViewId
        }, 2).then(function(data) {
            var clone = {
                _projectId: data._projectId,
                _refId: data._refId,
                //_modified: data._modified,
                id: data.id
            };
            if (data._childViews) {
                clone._childViews = JSON.parse(JSON.stringify(data._childViews));
            } else {
                clone._childViews = [];
            }
            clone._childViews.push({id: reqOb.viewId, aggregation: reqOb.aggr});
            ElementService.updateElement(clone, true)
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
     * @name mms.ViewService#removeViewFromParentView
     * @methodOf mms.ViewService
     *
     * @description
     * This removes the specified view from the parent view
     * 
     * @param {object} reqOb see ElementService.getElement, use viewId and parentViewId
     * @returns {Promise} The promise would be resolved with updated parent View object
     */
    var removeViewFromParentView = function(reqOb) {
        UtilsService.normalize(reqOb);
        var deferred = $q.defer();
        ElementService.getElement({
            projectId: reqOb.projectId,
            refId: reqOb.refId,
            elementId: reqOb.parentViewId
        }, 2).then(function(data) {
            if (data._childViews) {
                var clone = {
                    _projectId: data._projectId,
                    _refId: data._refId,
                    //_modified: data._modified,
                    //_read: data._read,
                    id: data.id,
                    _childViews: JSON.parse(JSON.stringify(data._childViews))
                };
                for (var i = 0; i < clone._childViews.length; i++) {
                    if (clone._childViews[i].id === reqOb.viewId) {
                        clone._childViews.splice(i,1);
                        break; 
                    }
                }
                ElementService.updateElement(clone, true)
                .then(function(data2) {
                    deferred.resolve(data2);
                }, function(reason) {
                    deferred.reject(reason);
                });
            } else {
                deferred.resolve(data);
            }
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
     * @param {object} reqOb see ElementService.getElement for description, elementId is the view
     *                          or section instance element id
     * @param {object} elementOb the element object to add (this should be an instanceValue)
     * @param {number} addPeIndex the index of where to add view or section (instance spec) object
     * @returns {Promise} The promise would be resolved with updated view or section object
     */
    var addElementToViewOrSection = function(reqOb, elementOb, addPeIndex) {
        UtilsService.normalize(reqOb);
        var deferred = $q.defer();
        ElementService.getElement({
            projectId: reqOb._projectId,
            refId: reqOb._refId,
            elementId: reqOb.id
        }, 2)
        .then(function(data) {
            var clone = {
                _projectId: data._projectId,
                _refId: data._refId,
                //_modified: data._modified,
                id: data.id,
            };
            var key = '_contents';
            if (isSection(data)) {
                key = "specification";
            }
            if (data[key]) {
                clone[key] = JSON.parse(JSON.stringify(data[key]));
                if (!clone[key].id || !clone[key].ownerId) {
                    clone[key].id = isSection(data) ? UtilsService.createMmsId() : data.id + "_vc_expression";
                    clone[key].ownerId = isSection(data) ? data.id : data.id + "_vc";
                }
            } else {
                clone[key] = UtilsService.createValueSpecElement({
                    operand: [],
                    type: "Expression",
                    id: isSection(data) ? UtilsService.createMmsId() : data.id + "_vc_expression",
                    ownerId: isSection(data) ? data.id : data.id + "_vc"
                });
            }
            elementOb.ownerId = clone[key].id;
            if (!elementOb.id) {
                elementOb.id = UtilsService.createMmsId();
            }
            if (addPeIndex >= -1)
                clone[key].operand.splice(addPeIndex+1, 0, UtilsService.createValueSpecElement(elementOb));
            else
                clone[key].operand.push(UtilsService.createValueSpecElement(elementOb));
            // clone[key].operand.push(UtilsService.createValueSpecElement(elementOb));
            ElementService.updateElement(clone)
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
     * @name mms.ViewService#removeElementFromViewOrSection
     * @methodOf mms.ViewService
     *
     * @description
     * This removes the specified instanceVal from the contents of the View or Section
     * 
     * @param {object} reqOb see ElementService.getElement for description
     * @param {object} instanceVal to remove from the View or Section
     * @returns {Promise} The promise would be resolved with updated View or Section object
     */
    var removeElementFromViewOrSection = function(reqOb, instanceVal) {
        UtilsService.normalize(reqOb);
        var deferred = $q.defer();

        if (instanceVal) {
            ElementService.getElement(reqOb, 2)
            .then(function(data) {
                var clone = {
                    _projectId: data._projectId,
                    _refId: data._refId,
                    //_modified: data._modified,
                    id: data.id,
                };
                var key = '_contents';
                if (isSection(data)) {
                    key = "specification";
                }
                if (data[key]) {
                    clone[key] = JSON.parse(JSON.stringify(data[key]));
                    if (!clone[key].id || !clone[key].ownerId) {
                        clone[key].id = isSection(data) ? UtilsService.createMmsId() : data.id + "_vc_expression";
                        clone[key].ownerId = isSection(data) ? data.id : data.id + "_vc";
                    }
                } else {
                    clone[key] = UtilsService.createValueSpecElement({
                        operand: [],
                        type: "Expression",
                        id: isSection(data) ? UtilsService.createMmsId() : data.id + "_vc_expression",
                        ownerId: isSection(data) ? data.id : data.id + "_vc"
                    });
                }
                if (clone[key] && clone[key].operand) {
                    var operands = data[key].operand;
                    for (var i = 0; i < operands.length; i++) {
                        if (instanceVal.instanceId === operands[i].instanceId) {
                            clone[key].operand.splice(i,1);
                            break;
                        }
                    }
                }
                ElementService.updateElement(clone)
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
     * Adds a InstanceVal/InstanceSpecification to the contents of the View
     *
     * @param {object} viewOrSection The View or Section element object to add to
     * @param {string} type The type of element that is to be created, ie 'Paragraph'
     * @param {string} [name=Untitled <elementType>] (optional) InstanceSpecification name to use
     * @param {number} addPeIndex the index of where to add view or section (instance spec) object
     * @returns {Promise} The promise would be resolved with updated View object if addToView is true
     *                    otherwise the created InstanceSpecification
    */
    var createInstanceSpecification = function(viewOrSectionOb, type, name, addPeIndex) {
        var deferred = $q.defer();

        var newInstanceId = UtilsService.createMmsId();
        newInstanceId = '_hidden_' + newInstanceId + "_pei";

        var realType = TYPE_TO_CLASSIFIER_TYPE[type];
        var jsonType = realType;
        if (type === 'Comment' || type === 'Paragraph')
            jsonType = type;
        /*
        var newDataId = UtilsService.createMmsId();
        var newDataSInstanceId = UtilsService.createMmsId();
        var newData = UtilsService.createClassElement({
            id: newDataId,
            name: name + '_' + newDataId,
            ownerId: 'holding_bin_' + viewOrSectionOb._projectId,
            documentation: '',
            _appliedStereotypeIds: [UtilsService.BLOCK_SID],
            appliedStereotypeInstanceId: newDataSInstanceId
        });
        var newDataSInstance = UtilsService.createInstanceElement({
            id: newDataSInstanceId,
            stereotypedElementId: newDataId,
            ownerId: newDataId,
            classifierIds: [UtilsService.BLOCK_SID]
        });
        */
        var instanceSpecSpec = {
            'type': jsonType,
            'sourceType': 'reference',
            'source': newInstanceId,
            'sourceProperty': 'documentation'
        };
        var instanceSpec = {
            id: newInstanceId,
            ownerId: 'view_instances_bin_' + viewOrSectionOb._projectId,
            name: name ? name : "Untitled " + type,
            documentation: '',
            type: "InstanceSpecification",
            classifierIds: [TYPE_TO_CLASSIFIER_ID[realType]],
            specification: UtilsService.createValueSpecElement({
                value: JSON.stringify(instanceSpecSpec),
                type: "LiteralString",
                ownerId: newInstanceId,
                id: UtilsService.createMmsId()
            }),
            _appliedStereotypeIds: [],
        };
        instanceSpec = UtilsService.createInstanceElement(instanceSpec);
        if (type === 'Section') {
            //newData = newDataSInstance = null;
            instanceSpec.specification = UtilsService.createValueSpecElement({
                operand: [],  
                type: "Expression",
                ownerId: newInstanceId,
                id: UtilsService.createMmsId()
            });
        }
        var clone = {
            _projectId: viewOrSectionOb._projectId,
            id: viewOrSectionOb.id,
            _refId: viewOrSectionOb._refId,
        };
        var key = '_contents';
        if (isSection(viewOrSectionOb)) {
            key = "specification";
        }
        if (!viewOrSectionOb[key]) {
            clone[key] = UtilsService.createValueSpecElement({
                operand: [],
                type: "Expression",
                id: isSection(viewOrSectionOb) ? UtilsService.createMmsId() : viewOrSectionOb.id + "_vc_expression",
                ownerId: isSection(viewOrSectionOb) ? viewOrSectionOb.id : viewOrSectionOb.id + "_vc"
            });
        } else {
            clone[key] = JSON.parse(JSON.stringify(viewOrSectionOb[key]));
            if (!clone[key].id || !clone[key].ownerId) {
                clone[key].id = isSection(viewOrSectionOb) ? UtilsService.createMmsId() : viewOrSectionOb.id + "_vc_expression";
                clone[key].ownerId = isSection(viewOrSectionOb) ? viewOrSectionOb.id : viewOrSectionOb.id + "_vc";
            }
        }
        if (addPeIndex >= -1) {
            clone[key].operand.splice(addPeIndex+1, 0, UtilsService.createValueSpecElement({instanceId: newInstanceId, type: "InstanceValue", id: UtilsService.createMmsId(), ownerId: clone[key].id}));
        } else {
            clone[key].operand.push(UtilsService.createValueSpecElement({instanceId: newInstanceId, type: "InstanceValue", id: UtilsService.createMmsId(), ownerId: clone[key].id}));
        }
        clone = ElementService.fillInElement(clone);
        var toCreate = [instanceSpec, clone];
        /*
        if (newData && newDataSInstance) {
            toCreate.push(newData);
            toCreate.push(newDataSInstance);
        }
        */
        var reqOb = {
            projectId: viewOrSectionOb._projectId,
            refId: viewOrSectionOb._refId,
            elements: toCreate,
        };
        ElementService.createElements(reqOb)
        .then(function(data) {
            for (var i = 0; i < data.length; i++) {
                var elem = data[i];
                if (elem.id === newInstanceId) {
                    if (type === "Section") {
                        $rootScope.$broadcast('viewctrl.add.section', elem, viewOrSectionOb);
                    }
                    deferred.resolve(elem);
                    return;
                }
            }
        }, function(reason) {
            deferred.reject(reason);
        });
        return deferred.promise;
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
     * @param {object} ownerOb should contain _project and _ref, can be a parent view with _childViews
     * @param {object} viewOb can specify optional viewId, viewName, viewDoc to be used when
     *                          creating the new view, boolean isDoc indicate whether it's a document
     * @param {string} peDoc optional documentation to set for pe creation
     * @returns {Promise} The promise will be resolved with the new view.
     */
    var createView = function(ownerOb, viewOb, peDoc) {
        var deferred = $q.defer();

        var newViewId = viewOb.viewId ? viewOb.viewId : UtilsService.createMmsId();
        var newInstanceId = '_hidden_' + UtilsService.createMmsId() + '_pei';

        var untitledName = viewOb.isDoc ? 'Untitled Document' : 'Untitled View';
        var view = UtilsService.createClassElement({
            id: newViewId,
            type: 'Class',
            ownerId: ownerOb.id,
            _allowedElements: [],
            _displayedElementIds: [newViewId],
            _childViews: [],
            _contents: UtilsService.createValueSpecElement({
                operand: [UtilsService.createValueSpecElement({type: "InstanceValue", instanceId: newInstanceId})],
                type: 'Expression',
                id: newViewId + "_vc_expression",
                ownerId: newViewId + "_vc"
            }),
            name: viewOb.viewName ? viewOb.viewName : untitledName,
            documentation: viewOb.viewDoc ? viewOb.viewDoc : '',
            _appliedStereotypeIds: [
                (viewOb.isDoc ? UtilsService.DOCUMENT_SID : UtilsService.VIEW_SID)
            ],
            appliedStereotypeInstanceId: newViewId + '_asi'
        });
        var parentView = null;
        if (ownerOb && (ownerOb._childViews || UtilsService.isView(ownerOb))) {
            parentView = {
                _projectId: ownerOb._projectId,
                _refId: ownerOb._refId,
                id: ownerOb.id
            };
            if (!ownerOb._childViews) {
                parentView._childViews = [];
            } else {
                parentView._childViews = JSON.parse(JSON.stringify(ownerOb._childViews));
            }
            parentView._childViews.push({id: newViewId, aggregation: "composite"});
        }
        var peSpec = {
            'type': 'Paragraph',
            'sourceType': 'reference',
            'source': newInstanceId,
            'sourceProperty': 'documentation'
        };
        var pe = UtilsService.createInstanceElement({
            id: newInstanceId,
            ownerId: 'view_instances_bin_' + ownerOb._projectId,
            name: "View Paragraph",
            documentation: peDoc ? peDoc : '',
            type: "InstanceSpecification",
            classifierIds:[TYPE_TO_CLASSIFIER_ID.ParagraphT],
            specification: UtilsService.createValueSpecElement({
                value: JSON.stringify(peSpec),
                type: "LiteralString",
                id: UtilsService.createMmsId(),
                ownerId: newInstanceId
            }),
            _appliedStereotypeIds: [],
        });
        var asi = UtilsService.createInstanceElement({ //create applied stereotype instance
            id: newViewId + '_asi',
            ownerId: newViewId,
            documentation: '',
            name: '',
            type: 'InstanceSpecification',
            classifierIds: [(viewOb.isDoc ? UtilsService.DOCUMENT_SID : UtilsService.VIEW_SID)],
            _appliedStereotypeIds: [],
            stereotypedElementId: newViewId
        });
        var toCreate = [pe, view, asi];
        if (parentView) {
            parentView = ElementService.fillInElement(parentView);
            toCreate.push(parentView);
        }
        var reqOb = {
            projectId: ownerOb._projectId,
            refId: ownerOb._refId,
            elements: toCreate,
            returnChildViews: true
        };
        ElementService.createElements(reqOb)
        .then(function(data) {
            data.forEach(function(elem) {
                if (elem.id === newViewId) {
                    deferred.resolve(elem);
                }
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
     * @param {object} ownerOb see createView
     * @param {object} docOb see createView
     * @returns {Promise} The promise will be resolved with the new view.
     */
    var createDocument = function(ownerOb, docOb) {
        var deferred = $q.defer();
        docOb.isDoc = true;
        createView(ownerOb, docOb)
            .then(function(data2) {
                if (ownerOb && ownerOb.id.indexOf("holding_bin") < 0) {
                    data2._groupId = ownerOb.id;
                }
                var cacheKey = ['documents', ownerOb._projectId, ownerOb._refId];
                if (CacheService.exists(cacheKey)) {
                    CacheService.get(cacheKey).push(data2);
                }
                deferred.resolve(data2);
            }, function(reason) {
                deferred.reject(reason);
            });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#createGroup
     * @methodOf mms.ViewService
     *
     * @description
     * create a group depending on what the user has selected:
     *   - if the user has not selected anything, create a group at the root level of the project
     *   - if the user has selected a group, create a child group
     *   - if the user has selected anything else, let the user know that they must select a group
     * owner must be specified (parent view/document)
     * id cannot be specified (automatically generated)
     * if name isn't specified, "Untitled" will be used.
     *
     * @param {object} name group name new-doc-or-group.html
     * @param {object} ownerOb parent id, projectId and refId
     * @param {string} orgId parent orgId
     * @returns {Promise} The promise will be resolved with the new group object.
     */
    var createGroup = function(name, ownerOb, orgId) {
        var deferred = $q.defer();

        var PACKAGE_ID = UtilsService.createMmsId(), PACKAGE_ASI_ID = PACKAGE_ID + "_asi";
        // Our Group package element
        var group = UtilsService.createPackageElement(
            {
                "id" : PACKAGE_ID,
                "name" : (name) ? name : "Untitled",
                "ownerId" : ownerOb.id,
                "_isGroup": true,
                "_appliedStereotypeIds": [GROUP_ST_ID],
                "appliedStereotypeInstanceId": PACKAGE_ASI_ID
            }
        );
        var groupAsi = UtilsService.createInstanceElement(
            {
                "classifierIds" : [GROUP_ST_ID],
                "id" : PACKAGE_ASI_ID,
                "ownerId" : PACKAGE_ID,
                "visibility" : null,
                "stereotypedElementId" : PACKAGE_ID
            }
        );
        var toCreate = [group, groupAsi];
        var reqOb = {
            projectId: ownerOb._projectId,
            refId: ownerOb._refId,
            elements: toCreate
        };
        ElementService.createElements(reqOb)
            .then(function(data) {
                var cacheKey = ['groups', ownerOb._projectId, ownerOb._refId];
                var groupObj = _.find(data, {id: PACKAGE_ID});
                if (groupObj) {
                    groupObj._parentId = ownerOb.id.indexOf('holding') != -1 ? null : ownerOb.id;
                    groupObj._link = '/share/page/repository#filter=path|/Sites/' + orgId + '/documentLibrary/' + groupObj._projectId + '/' + groupObj.id;
                    if (CacheService.exists(cacheKey)) {
                        CacheService.get(cacheKey).push(groupObj);
                    }
                    CacheService.put(['group', groupObj.projectId, groupObj.refId, groupObj.id], groupObj, true);
                    deferred.resolve(groupObj);
                } else {
                    deferred.reject({status: 500, message: "Failed to create group"});
                }
            }, function(reason) {
                console.log('POST failed:', reason);
                deferred.reject(reason);
            });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#deleteGroup
     * @methodOf mms.ViewService
     *
     * @description remove a group
     *
     * @param {object} elementOb group to remove
     * @returns {Promise} The promise will be resolved with the updated group object.
     */
    var removeGroup = function(elementOb) {
        elementOb._isGroup = false;
        _.remove(elementOb._appliedStereotypeIds, function(id) {
            return id === GROUP_ST_ID;
        });
        elementOb.appliedStereotypeInstanceId = elementOb._appliedStereotypeIds.length > 0 ? elementOb.appliedStereotypeInstanceId : null;
        var updatedElement = {
            id: elementOb.id,
            _projectId: elementOb._projectId,
            _refId: elementOb._refId,
            _appliedStereotypeIds: elementOb._appliedStereotypeIds,
            appliedStereotypeInstanceId: elementOb.appliedStereotypeInstanceId,
            _isGroup: elementOb._isGroup
        };
        var toUpdate = [updatedElement];
        if (updatedElement.appliedStereotypeInstanceId !== null) {
            toUpdate.push({
                id: elementOb.id + '_asi', 
                _refId: elementOb._refId, 
                _projectId: elementOb._projectId,
                classifierIds: updatedElement._appliedStereotypeIds
            });
        } else {
            $http.delete(URLService.getElementURL({
                elementId: elementOb.id + '_asi', 
                refId: elementOb._refId, 
                projectId: elementOb._projectId
            }));
        }
        return ElementService.updateElements(toUpdate, false)
            .then(function(data) {
                // remove this group for cache
                var cacheKey = ['groups', elementOb._projectId, elementOb._refId];
                var groups = CacheService.get(cacheKey) || [];
                _.remove(groups, function(group) {
                    return group.id === elementOb.id;
                });
                return data;
            }, function(reason) {
                return reason;
            });
    };

    /**
     * @ngdoc method
     * @name mms.ViewService#getProjectDocuments
     * @methodOf mms.ViewService
     * 
     * @description
     * Gets all the documents in a site
     * 
     * @param {string} site Site name
     * @param {boolean} [update=false] Update latest
     * @param {string} [workspace=master] workspace to use 
     * @param {string} [version=latest] timestamp
     * @param {int} weight the priority of the request
     * @returns {Promise} The promise will be resolved with array of document objects 
     */
    var getProjectDocuments = function(reqOb, weight, update) {
        UtilsService.normalize(reqOb);
        var deferred = $q.defer();
        var url = URLService.getProjectDocumentsURL(reqOb);
        var cacheKey = ['documents', reqOb.projectId, reqOb.refId];
        if (CacheService.exists(cacheKey) && !update) {
            deferred.resolve(CacheService.get(cacheKey));
        } else {
            ElementService.getGenericElements(url, reqOb, 'documents', weight, update).
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
     * @name mms.ViewService#getPresentationElementSpec
     * @methodOf mms.ViewService
     * 
     * @description
     * Parses an instanceSpec of the expression reference tree in the contents
     * of a View, and returns the corresponding presentation element json object.
     * 
     * @param {object} instanceSpec instance specification object
     * @returns {object} The json object for the corresponding presentation element
     */
    var getPresentationElementSpec = function(instanceSpec) {
        var instanceSpecSpec = instanceSpec.specification;
        if (!instanceSpecSpec) {
            return {status: 500, message: 'missing specification'};
        }
        var type = instanceSpecSpec.type;

        if (type === 'LiteralString') { // If it is a Opaque List, Paragraph, Table, Image, List:
            var jsonString = instanceSpecSpec.value;
            return JSON.parse(jsonString);
        } else if (type === 'Expression') { // If it is a Opaque Section, or a Expression:
            // If it is a Opaque Section then we want the instanceSpec:
            if (isSection(instanceSpec)) {
                return instanceSpec;
            } else { //??
                return instanceSpecSpec;
            }
        }
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
            instanceId: id of the instance,
            instanceVal: instanceValue object,
            sectionElements: array of child tree nodes,
            instanceSpecification: instance specification object of the instance,
            presentationElement: json of the presentation element or a section instance spec with type = Section
        }
     * </pre>
     *
     * @param {object} reqOb see ElementService.getElement
     * @param {object} contents an expression object from a view or section
     * @param {int} weight the priority of the request
     * @returns {Promise} The promise will be resolved with array of tree node objects
     */
    var getElementReferenceTree = function(reqOb, contents, weight) {
        var promises = [];
        for (var i = 0; i < contents.operand.length; i++) {
            promises.push(getElementReference(reqOb, contents.operand[i], weight));
        }
        return $q.all(promises);
    };

    var getElementReference = function(reqOb, instanceVal, weight) {
        var deferred = $q.defer();

        var elementObject = {};
        elementObject.instanceId = instanceVal.instanceId;
        elementObject.instanceVal = instanceVal;
        elementObject.sectionElements = [];

        var req = JSON.parse(JSON.stringify(reqOb));
        req.elementId = instanceVal.instanceId;
        ElementService.getElement(req, weight)
        .then(function(instanceSpecification) {
            elementObject.instanceSpecification = instanceSpecification;
            if (instanceSpecification.classifierIds &&
                    instanceSpecification.classifierIds.length > 0 && 
                    opaqueClassifiers.indexOf(instanceSpecification.classifierIds[0]) >= 0) {
                elementObject.isOpaque = true;
            } else {
                elementObject.isOpaque = false;
            }
            var presentationElement = getPresentationElementSpec(instanceSpecification);
            elementObject.presentationElement = presentationElement;
            if (isSection(presentationElement)) {
                getElementReferenceTree(req, presentationElement.specification)
                .then(function(sectionElementReferenceTree) {
                    elementObject.sectionElements = sectionElementReferenceTree;
                    deferred.resolve(elementObject);
                }, function(reason) {
                    deferred.reject(reason);
                });
            } else
                deferred.resolve(elementObject);
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
        return instanceSpec.classifierIds &&
               instanceSpec.classifierIds.length > 0 &&
               (instanceSpec.classifierIds[0] === TYPE_TO_CLASSIFIER_ID.Section ||
                instanceSpec.classifierIds[0] === TYPE_TO_CLASSIFIER_ID.SectionT);
    };

    var isTable = function(instanceSpec) {
        return instanceSpec.classifierIds && 
               instanceSpec.classifierIds.length > 0 &&
               (instanceSpec.classifierIds[0] === TYPE_TO_CLASSIFIER_ID.Table ||
                instanceSpec.classifierIds[0] === TYPE_TO_CLASSIFIER_ID.TableT);
    };

    var isFigure = function(instanceSpec) {
        return instanceSpec.classifierIds && 
               instanceSpec.classifierIds.length > 0 &&
               (instanceSpec.classifierIds[0] === TYPE_TO_CLASSIFIER_ID.ImageT ||
                instanceSpec.classifierIds[0] === TYPE_TO_CLASSIFIER_ID.Image || 
                instanceSpec.classifierIds[0] === TYPE_TO_CLASSIFIER_ID.Figure ||
                instanceSpec.classifierIds[0] === TYPE_TO_CLASSIFIER_ID.FigureT);
    };

    var isEquation = function(instanceSpec) {
        return instanceSpec.classifierIds && 
               instanceSpec.classifierIds.length > 0 &&
               instanceSpec.classifierIds[0] === TYPE_TO_CLASSIFIER_ID.Equation;
    };

    var getTreeType = function(instanceSpec) {
        if (isSection(instanceSpec))
            return 'section';
        if (instanceSpec.specification && instanceSpec.specification.value && JSON.parse(instanceSpec.specification.value).excludeFromList) {
            return null;
        }
        if (isTable(instanceSpec))
            return 'table';
        if (isFigure(instanceSpec))
            return 'figure';
        if (isEquation(instanceSpec))
            return 'equation';
        return null;
    };

    var processSlotStrings = function(values) {
        var res = [];
        if (!values || values.length === 0) {
            return res;
        }
        values.forEach(function(value) {
            if (value.type !== 'LiteralString' || !value.value)
                return;
            res.push(value.value);
        });
        return res;
    };

    var processSlotIntegers = function(values) {
        var res = [];
        if (!values || values.length === 0) {
            return res;
        }
        values.forEach(function(value) {
            if (Number.isInteger(value.value)) {
                res.push(value.value);
            } else if ((typeof value.value) === 'string') {
                var val = parseInt(value.value);
                if (!isNaN(val)) {
                    res.push(val);
                }
            }
        });
        return res;
    };
    
    /**
     * @ngdoc method
     * @name mms.ViewService#getDocMetadata
     * @methodOf mms.ViewService
     * 
     * @description
     * gets Document properties from docgen's stereotypes
     *
     * @param {object} reqOb see ElementService.getElement
     * @param {integer} weight the priority of the request
     * @returns {Promise} The promise will be resolved with metadata object
     *                      with name value pairs corresponding to document stereotype
     */
    var getDocMetadata = function(reqOb, weight) {
        var deferred = $q.defer();
        var metadata = {numberingDepth: 0, numberingSeparator: '.'};
        reqOb.elementIds = [
            reqOb.elementId + '_asi-slot-_17_0_1_407019f_1326234342817_186479_2256', //header
            reqOb.elementId + '_asi-slot-_17_0_1_407019f_1326234349580_411867_2258', //footer
            reqOb.elementId + '_asi-slot-_18_5_3_8bf0285_1526605771405_96327_15754', //numbering depth
            reqOb.elementId + '_asi-slot-_18_5_3_8bf0285_1526605817077_688557_15755' //numbering separator
        ];
        ElementService.getElements(reqOb, weight)
        .then(function(data) {
            if (data.length === 0) {
                return;
            }
            for (var i = 0; i < data.length; i++) {
                var prop = data[i];
                var feature = prop.definingFeatureId ? prop.definingFeatureId : null;
                var value = prop.value ? prop.value : null;
                if (!feature || !value || value.length === 0) {
                    continue;
                }
                var result = [];
                if (feature === '_17_0_1_407019f_1326234342817_186479_2256') { //header
                    result = processSlotStrings(value);
                    metadata.top = result.length > 0 ? result[0] : '';
                    metadata.topl = result.length > 1 ? result[1] : '';
                    metadata.topr = result.length > 2 ? result[2] : '';
                } else if (feature == '_17_0_1_407019f_1326234349580_411867_2258') {//footer
                    result = processSlotStrings(value);
                    metadata.bottom = result.length > 0 ? result[0] : '';
                    metadata.bottoml = result.length > 1 ? result[1] : '';
                    metadata.bottomr = result.length > 2 ? result[2] : '';
                } else if (feature == '_18_5_3_8bf0285_1526605771405_96327_15754') { //depth
                    result = processSlotIntegers(value);
                    metadata.numberingDepth = result.length > 0 ? result[0] : 0;
                } else if (feature == '_18_5_3_8bf0285_1526605817077_688557_15755') { //separator
                    result = processSlotStrings(value);
                    metadata.numberingSeparator = result.length > 0 ? result[0] : '.';
                }
            }
        }, function(reason) {
        }).finally(function() {
            deferred.resolve(metadata);
        });
        return deferred.promise;
    };

    var getPresentationElementType = function (instanceSpec) {
        if (instanceSpec.type === 'InstanceSpecification') {
            if (isSection(instanceSpec)) {
                return 'Section';
            }  else if (isTable(instanceSpec)) {
                return 'Table';
            } else if (isFigure(instanceSpec)) {
                return 'Image';
            } else if (isEquation(instanceSpec)) {
                return 'Equation';
            } else if (instanceSpec.specification && instanceSpec.specification.value) {
                // var type = JSON.parse(instanceSpec.specification.value).type;
                // return type.toLowerCase();
                return JSON.parse(instanceSpec.specification.value).type;
            }
        }
        return false;
    };

    var isGroup = function(instanceSpec) {
        return instanceSpec._appliedStereotypeIds !== undefined && instanceSpec._appliedStereotypeIds.length > 0 && instanceSpec._appliedStereotypeIds[0] === GROUP_ST_ID;
    };

    var getElementType = function(element) {
        // Get Type
        var elementType = '';
        if (UtilsService.isRequirement(element)) {
            elementType = 'Requirement';
        } else if (UtilsService.isDocument(element)) {
            elementType = 'Document';
        } else if (UtilsService.isView(element)) {
            elementType = 'View';
        } else if (isGroup(element)) {
            elementType = 'Group';
        } else {
            elementType = getPresentationElementType(element);
        }
        return elementType;
    };

    var reset = function() {
        inProgress = {};
    };

    var getTypeFromClassifierId = function(classifierIds) {
        var type = '';
        if ( classifierIds && classifierIds.length > 0) {
            Object.keys(TYPE_TO_CLASSIFIER_ID).some(function(key) {
                if(TYPE_TO_CLASSIFIER_ID[key] === classifierIds[0]) {
                    type = key;
                    return true;
                }
                return false;
            });
        }
        return type;
    };


    return {
        TYPE_TO_CLASSIFIER_ID: TYPE_TO_CLASSIFIER_ID,
        getViewElements: getViewElements,
        createView: createView,
        createDocument: createDocument,
        createGroup: createGroup,
        removeGroup: removeGroup,
        downgradeDocument: downgradeDocument,
        addViewToParentView: addViewToParentView,
        getProjectDocuments: getProjectDocuments,
        getPresentationElementSpec: getPresentationElementSpec,
        isSection: isSection,
        isFigure: isFigure,
        isTable: isTable,
        isEquation: isEquation,
        getTreeType: getTreeType,
        getPresentationElementType: getPresentationElementType,
        getElementType: getElementType,
        addElementToViewOrSection: addElementToViewOrSection,
        removeElementFromViewOrSection: removeElementFromViewOrSection,
        removeViewFromParentView: removeViewFromParentView,
        createInstanceSpecification: createInstanceSpecification,
        getTypeFromClassifierId: getTypeFromClassifierId,
        getElementReferenceTree : getElementReferenceTree,
        getDocMetadata: getDocMetadata,
        reset: reset,
        AnnotationType: AnnotationType
    };

}
