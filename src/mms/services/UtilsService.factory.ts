import * as angular from "angular";
var mms = angular.module('mms');


mms.factory('UtilsService', ['$q', '$http', 'CacheService', 'URLService', 'ApplicationService', '_', UtilsService]);

/**
 * @ngdoc service
 * @name mms.UtilsService
 * @requires $q
 * @requires $http
 * @requires CacheService
 * @requires URLService
 * @requires ApplicationService
 * @requires _
 * 
 * @description
 * Utilities
 */
function UtilsService($q, $http, CacheService, URLService, ApplicationService, _) {
    var PROJECT_URL_PREFIX = 'mms.html#/projects/';
    var VIEW_SID = '_11_5EAPbeta_be00301_1147420760998_43940_227';
    var OTHER_VIEW_SID = ['_17_0_1_407019f_1332453225141_893756_11936',
        '_17_0_1_232f03dc_1325612611695_581988_21583', '_18_0beta_9150291_1392290067481_33752_4359'];
    var DOCUMENT_SID = '_17_0_2_3_87b0275_1371477871400_792964_43374';
    var BLOCK_SID = '_11_5EAPbeta_be00301_1147424179914_458922_958';
    var REQUIREMENT_SID = ['_project-bundle_mission_PackageableElement-mission_u003aRequirement_PackageableElement',
        '_18_0_5_f560360_1476403587924_687681_736366','_18_0_5_f560360_1476403587924_687681_736366',
        '_11_5EAPbeta_be00301_1147873190330_159934_2220'];
    var editKeys = ['name', 'documentation', 'defaultValue', 'value', 'specification', 'id', '_projectId', '_refId', 'type'];
    var CLASS_ELEMENT_TEMPLATE = {
        _appliedStereotypeIds: [],
        appliedStereotypeInstanceId: null,
        classifierBehaviorId: null,
        clientDependencyIds: [],
        collaborationUseIds: [],
        documentation: "",
        elementImportIds: [],
        generalizationIds: [],
        interfaceRealizationIds: [],
        isAbstract: false,
        isActive: false,
        isFinalSpecialization: false,
        isLeaf: false,
        mdExtensionsIds: [],
        name: "",
        nameExpression: null,
        ownedAttributeIds: [],
        ownedOperationIds: [],
        ownerId: null,
        packageImportIds: [],
        powertypeExtentIds: [],
        redefinedClassifierIds: [],
        representationId: null,
        substitutionIds: [],
        supplierDependencyIds: [],
        syncElementId: null,
        templateBindingIds: [],
        templateParameterId: null,
        type: "Class",
        useCaseIds: [],
        visibility: 'public'
    };
    var INSTANCE_ELEMENT_TEMPLATE = {
        appliedStereotypeInstanceId: null,
        classifierIds: [],
        clientDependencyIds: [],
        deploymentIds: [],
        documentation: '',
        mdExtensionsIds: [],
        name: '',
        nameExpression: null,
        ownerId: null,
        slotIds: [],
        specification: null,
        stereotypedElementId: null,
        supplierDependencyIds: [],
        syncElementId: null,
        templateParameterId: null,
        type: "InstanceSpecification",
        visibility: "public",
        _appliedStereotypeIds: [],
    };
    var VALUESPEC_ELEMENT_TEMPLATE = {
        appliedStereotypeInstanceId: null,
        clientDependencyIds: [ ],
        documentation: "",
        mdExtensionsIds: [ ],
        name: "",
        nameExpression: null,
        supplierDependencyIds: [ ],
        syncElementId: null,
        templateParameterId: null,
        typeId: null,
        visibility: "public",
        _appliedStereotypeIds: [ ],
    };
    var PACKAGE_ELEMENT_TEMPLATE = {
        _appliedStereotypeIds : [ ],
        documentation : "",
        type : "Package",
        mdExtensionsIds : [ ],
        syncElementId : null,
        appliedStereotypeInstanceId : null,
        clientDependencyIds : [ ],
        supplierDependencyIds : [ ],
        name : "",
        nameExpression : null,
        visibility : null,
        templateParameterId : null,
        elementImportIds : [ ],
        packageImportIds : [ ],
        templateBindingIds : [ ],
        URI : "",
        packageMergeIds : [ ],
        profileApplicationIds : [ ]
    };
    var GENERALIZATION_ELEMENT_TEMPLATE = {
        appliedStereotypeInstanceId : null,
        documentation : "",
        generalizationSetIds : [ ],
        isSubstitutable : true,
        mdExtensionsIds : [ ],
        syncElementId : null,
        type : "Generalization",
        _appliedStereotypeIds : [ ],
    };
    var DEPENDENCY_ELEMENT_TEMPLATE = {
        _appliedStereotypeIds : [ ],
        appliedStereotypeInstanceId : null,
        clientDependencyIds : [ ],
        documentation : "",
        mdExtensionsIds : [ ],
        name : "",
        nameExpression : null,
        supplierDependencyIds : [ ],
        syncElementId : null,
        templateParameterId : null,
        type : "Dependency",
        visibility : null,
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#hasCircularReference
     * @methodOf mms.UtilsService
     *
     * @description
     * Tells whether or not there exists a circular reference
     *
     * @param {Object} scope scope
     * @param {string} curId current id
     * @param {string} curType current type
     * @returns {boolean} true or false
     */
    var hasCircularReference = function(scope, curId, curType) {
        var curscope = scope;
        while (curscope.$parent) {
            var parent = curscope.$parent;
            if (parent.mmsElementId === curId && parent.cfType === curType)
                return true;
            curscope = parent;
        }
        return false;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#cleanValueSpec
     * @methodOf mms.UtilsService
     *
     * @description
     * Cleans value specification
     *
     * @param {Object} vs value spec object
     * @returns {void} nothing
     */
    var cleanValueSpec = function(vs) {
        if (vs.hasOwnProperty('valueExpression'))
            delete vs.valueExpression;
        if (vs.operand) {
            for (var i = 0; i < vs.operand.length; i++) {
                cleanValueSpec(vs.operand[i]);
            }
        }
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#cleanElement
     * @methodOf mms.UtilsService
     * 
     * @description
     * Cleans 
     *
     * @param {Object} elem the element object to be cleaned 
     * @param {boolean} [forEdit=false] (optional) forEdit.
     * @returns {Object} clean elem
     */
    var cleanElement = function(elem, forEdit) {
        var i = 0;
        if (elem.type === 'Property' || elem.type === 'Port') {
            if (!elem.defaultValue) {
                elem.defaultValue = null;
            }
        }
        if (elem.type === 'Slot') {
            if (!_.isArray(elem.value))
                elem.value = [];
        }
        if (elem.value) {
            for (i = 0; i < elem.value.length; i++) {
                cleanValueSpec(elem.value[i]);
            }
        }
        if (elem._contents) {
            cleanValueSpec(elem._contents);
        }
        if (elem.specification) {
            cleanValueSpec(elem.specification);
        }
        if (elem.type === 'Class') {
            if (elem._contents && elem.contains) {
                delete elem.contains;
            }
            if (Array.isArray(elem._displayedElementIds)) {
                elem._displayedElementIds = JSON.stringify(elem._displayedElementIds);
            }
            if (elem._allowedElementIds) {
                delete elem._allowedElementIds;
            }
        }
        if (elem.hasOwnProperty('specialization')) {
            delete elem.specialization;
        }
        if (forEdit) { //only keep editable or needed keys in edit object instead of everything
            var keys = Object.keys(elem);
            for (var keyIndex in keys) {
                if (editKeys.indexOf(keys[keyIndex]) >= 0) {
                    continue;
                }
                delete elem[keys[keyIndex]];
            }
        }
        return elem;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#buildTreeHierarchy
     * @methodOf mms.UtilsService
     *
     * @description
     * builds hierarchy of tree branch objects
     *
     * @param {array} array array of objects
     * @param {string} id key of id field
     * @param {string} type type of object
     * @param {object} parent key of parent field
     * @param {callback} level2_Func function to get childen objects
     * @returns {void} root node
     */
    var buildTreeHierarchy = function (array, id, type, parent, level2_Func) {
        var rootNodes = [];
        var data2Node = {};
        var i = 0;
        var data = null;
        // make first pass to create all nodes
        for (i = 0; i < array.length; i++) {
            data = array[i];
            data2Node[data[id]] = { 
                label : data.name, 
                type : type,
                data : data, 
                children : [] 
            };
        }
        // make second pass to associate data to parent nodes
        for (i = 0; i < array.length; i++) {
            data = array[i];
            // If theres an element in data2Node whose key matches the 'parent' value in the array element
            // add the array element to the children array of the matched data2Node element
            if (data[parent] && data2Node[data[parent]]) {//bad data!
                data2Node[data[parent]].children.push(data2Node[data[id]]);
            } else {
            // If theres not an element in data2Node whose key matches the 'parent' value in the array element
            // it's a "root node" and so it should be pushed to the root nodes array along with its children
                rootNodes.push(data2Node[data[id]]);
            }
        }

        //apply level2 function if available
        if (level2_Func) {
            for (i = 0; i < array.length; i++) {
                data = array[i];
                var level1_parentNode = data2Node[data[id]];
                level2_Func(data, level1_parentNode);
            }
        }

        var sortFunction = function(a, b) {
            if (a.children.length > 1) {
                a.children.sort(sortFunction);
            }
            if (b.children.length > 1) {
                b.children.sort(sortFunction);
            }
            if (a.label.toLowerCase() < b.label.toLowerCase()) {
                return -1;
            }
            if (a.label.toLowerCase() > b.label.toLowerCase()) {
                return 1;
            }
            return 0;
        };
        rootNodes.sort(sortFunction);
        return rootNodes;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#normalize
     * @methodOf mms.UtilsService
     * 
     * @description
     * Normalize common arguments
     *
     * @param {Object} ob Object with update, workspace, version keys
     * @returns {Object} object with update, ws, ver keys based on the input.
     *      default values: {update: false, ws: 'master', ver: 'latest'}
     */
    var normalize = function(reqOb) {
        reqOb.extended = !reqOb.extended ? false : true;
        reqOb.refId = !reqOb.refId ? 'master' : reqOb.refId;
        reqOb.commitId = !reqOb.commitId ? 'latest' : reqOb.commitId;
        return reqOb;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#makeElementKey
     * @methodOf mms.UtilsService
     * 
     * @description
     * Make key for element for use in CacheService
     *
     * @param {string} elementOb element object
     * @param {boolean} [edited=false] element is to be edited
     * @returns {Array} key to be used in CacheService
     */
    var makeElementKey = function(elementOb, edit) {
        var refId = !elementOb._refId ? 'master' : elementOb._refId;
        var commitId = !elementOb._commitId ? 'latest' : elementOb._commitId;
        var key = ['element', elementOb._projectId, refId, elementOb.id, commitId];
        if (edit)
            key.push('edit');
        return key;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#makeArtifactKey
     * @methodOf mms.UtilsService
     * 
     * @description
     * Make key for element for use in CacheService
     *
     * @param {string} elementOb element object
     * @param {boolean} [edited=false] element is to be edited
     * @returns {Array} key to be used in CacheService
     */
    var makeArtifactKey = function(elementOb, edit) {
        var refId = !elementOb._refId ? 'master' : elementOb._refId;
        var commitId = !elementOb._commitId ? 'latest' : elementOb._commitId;
        var key = ['artifact', elementOb._projectId, refId, elementOb.id, commitId];
        if (edit)
            key.push('edit');
        return key;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#mergeElement
     * @methodOf mms.UtilsService
     * 
     * @description
     * Make key for element for use in CacheService
     *
     * @param {object} source the element object to merge in 
     * @param {boolean} [updateEdit=false] updateEdit
     * @returns {void} nothing 
     */
    var mergeElement = function(source, updateEdit) {
        //TODO remove calls to this, shoudl use ElementService.cacheElement
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#filterProperties
     * @methodOf mms.UtilsService
     * 
     * @description
     * given element object a and element object b,
     * returns new object with b data minus keys not in a 
     * (set notation A intersect B)
     *
     * @param {Object} a Element Object
     * @param {Object} b Element Object
     * @returns {Object} new object
     */
    var filterProperties = function(a, b) {
        var res = {};
        for (var key in a) {
            if (a.hasOwnProperty(key) && b.hasOwnProperty(key)) {
                res[key] = b[key];
            }
        }
        return res;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#hasConflict
     * @methodOf mms.UtilsService
     * 
     * @description		
     *  Checks if sever and cache version of the element are
     *  the same so that the user is aware that they are overriding 
     *  changes to the element that they have not seen in the cache element.
     *  Given edit object with only keys that were edited,
     * 'orig' object and 'server' object, should only return true 
     *	if key is in edit object and value in orig object is different 
     *  from value in server object. 
     *
     * @param {Object} edit An object that contains element id and any property changes to be saved.
     * @param {Object} orig version of elem object in cache.
     * @param {Object} server version of elem object from server.
     * @returns {Boolean} true if conflict, false if not
     */
    var hasConflict = function(edit, orig, server) {
        for (var i in edit) {
            if (i === '_read' || i === '_modified' || i === '_modifier' || 
                    i === '_creator' || i === '_created' || i === '_commitId') {
                continue;
            }
            if (edit.hasOwnProperty(i) && orig.hasOwnProperty(i) && server.hasOwnProperty(i)) {
                if (!angular.equals(orig[i], server[i])) {
                    return true;
                }
            }
        }
        return false;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#isRestrictedValue
     * @methodOf mms.UtilsService
     *
     * @description
     * deprecated
     *
     * @param {string} table table content
     * @returns {boolean} boolean
     */
    function isRestrictedValue(values) {
        if (values.length > 0 && values[0].type === 'Expression' &&
                values[0].operand.length === 3 && values[0].operand[0].value === 'RestrictedValue' &&
                values[0].operand[2].type === 'Expression' && values[0].operand[2].operand.length > 0 &&
                values[0].operand[1].type === 'ElementValue') {
            return true;
        }
        return false;
    }

    /**
     * @ngdoc method
     * @name mms.UtilsService#makeHtmlTable
     * @methodOf mms.UtilsService
     *
     * @description
     * make html table based on table spec object
     *
     * @param {object} table table content
     * @param {boolean} isFilterable table content
     * @param {boolean} isSortable table content
     * @returns {string} generated html string
     */
    var makeHtmlTable = function(table, isFilterable?, isSortable?, pe?) {
        var result = ['<table class="table-bordered table-condensed ' + (table.style ? table.style : '') + '">'];
        if (table.colwidths && table.colwidths.length > 0) {
            result.push('<colgroup>');
            for (var i = 0; i < table.colwidths.length; i++) {
                if (table.colwidths[i]) {
                    result.push('<col style="width: ' + table.colwidths[i] + '">');
                } else {
                    result.push('<col>');
                }
            }
            result.push('</colgroup>');
        }
        result.push('<tbody>'); //put tbody before thead to control stacking context so if freeze header/columns are both used headers cover cells (?)
        //https://stackoverflow.com/questions/45676848/stacking-context-on-table-elementhead-and-body
        result.push(makeTableBody(table.body, false));
        result.push('</tbody>');
        if (table.header && table.header.length) {
            // only add styling to the filterable or sortable header
            if ( isFilterable || isSortable ) {
                result.push('<thead class="doc-table-header" >');
            } else {
                result.push('<thead>');
            }

            result.push(makeTableBody(table.header, true, isFilterable, isSortable));
            result.push('</thead>');
        }
        if (ApplicationService.getState().inDoc && !table.excludeFromList) {
            result.push('<caption>Table {{mmsPe._veNumber}}. {{table.title || mmsPe.name}}</caption>');
        } else if (table.title) {
            result.push('<caption>' + table.title + '</caption>');
        } //same for caption to control stacking context
        result.push('</table>');
        return result.join('');
    };

    var tableConfig = {
        sortByColumnFn: 'sortByColumnFn',
        showBindingForSortIcon: 'sortColumnNum',
        filterDebounceRate: 200,
        filterTermColumnPrefixBinding: 'filterTermForColumn'
    };

    /** Include row and column number for table's header data object **/
    var _generateRowColNumber = function(header) {
      header.forEach(function (row, rowIndex) {
          var startCol = 0;
          var colCounter = 0;
          row.forEach(function (cell, cellIndex) {
              // startCol is always 0 except when row > 0th and on cell === 0th && rowSpan of the previous row's first element is larger than 1
              // This is the only time when we need to offset the starting colNumber for cells under merged column(s)
              if ( rowIndex !== 0 && cellIndex === 0 && Number(header[rowIndex - 1][0].rowspan) > 1 ) {
                  startCol = Number(header[rowIndex - 1][0].colspan);
              }
              var colSpan = Number(cell.colspan);
              cell.startRow = rowIndex;
              cell.endRow = cell.startRow + Number(cell.rowspan) - 1;
              cell.startCol = startCol + colCounter;
              cell.endCol = cell.startCol +  colSpan - 1;
              colCounter += colSpan;
          });
          startCol = 0;
          colCounter = 0;
      });
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#makeTableBody
     * @methodOf mms.UtilsService
     *
     * @description
     * make html table body based on body spec object
     *
     * @param {object} body body content
     * @param {boolean} isHeader is header
     * @param {boolean} isFilterable is filterable
     * @param {boolean} isSortable is sortable
     * @returns {string} generated html string
     */
    var makeTableBody = function(body, isHeader, isFilterable?, isSortable?) {
        if ( isHeader && (isFilterable || isSortable ) ) {
            _generateRowColNumber(body);
        }
        var result = [], i, j, k, row, cell, thing;
        var dtag = (isHeader ? 'th' : 'td');
        for (i = 0; i < body.length; i++) {
            result.push('<tr>');
            row = body[i];
            for (j = 0; j < row.length; j++) {
                cell = row[j];
                result.push('<' + dtag + ' colspan="' + cell.colspan + '" rowspan="' + cell.rowspan + '">');
                for (k = 0; k < cell.content.length; k++) {
                    thing = cell.content[k];
                    if ( isFilterable || isSortable ) {
                        result.push('<div ng-style="{display: \'inline\'}">');
                    } else {
                        result.push('<div>');
                    }

                    if (thing.type === 'Paragraph') {
                        var para = makeHtmlPara(thing);
                        // add special styling for header's title
                        if ( ( isFilterable || isSortable ) && thing.sourceType === 'text' ) {
                            para = para.replace('<p>', '<p ng-style="{display: \'inline\'}">' );
                        }
                        result.push(para);
                    } else if (thing.type === 'Table') {
                        result.push(makeHtmlTable(thing));
                    } else if (thing.type === 'List') {
                        result.push(makeHtmlList(thing));
                    } else if (thing.type === 'Image') {
                        //todo use mmsCf
                        result.push('<mms-cf mms-cf-type="img" mms-element-id="' + thing.id + '"></mms-cf>');
                    }
                    result.push('</div>');
                    if ( isHeader ) {
                        if ( isSortable && Number(cell.colspan) === 1 ) {
                            result.push('<span' + ' ng-click=\"'+ tableConfig.sortByColumnFn + "(" + cell.startCol + ")" + '\"' + ' ng-class=\"'+ 'getSortIconClass('+ cell.startCol + ')' + '\"></span>');
                        }
                        if ( isFilterable ) {
                            result.push('<input class="no-print ve-plain-input filter-input" type="text" placeholder="Filter column"' + ' ng-show="showFilter" ng-model-options=\"{debounce: '+ tableConfig.filterDebounceRate  + '}\"' + ' ng-model=\"' + tableConfig.filterTermColumnPrefixBinding + cell.startCol + cell.endCol + '\">');
                        }
                    }
                }
                result.push('</' + dtag + '>');
            }
            result.push('</tr>');
        }
        return result.join('');
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#makeHtmlList
     * @methodOf mms.UtilsService
     *
     * @description
     * make html list string based on list spec object
     *
     * @param {object} list list specification object
     * @returns {string} generated html string
     */
    var makeHtmlList = function(list) {
        var result = [], i, j, item, thing;
        if (list.ordered)
            result.push('<ol>');
        else
            result.push('<ul>');
        for (i = 0; i < list.list.length; i++) {
            item = list.list[i];
            result.push('<li>');
            for (j = 0; j < item.length; j++) {
                thing = item[j];
                result.push('<div>');
                if (thing.type === 'Paragraph') {
                    result.push(makeHtmlPara(thing));
                } else if (thing.type === 'Table') {
                    result.push(makeHtmlTable(thing));
                } else if (thing.type === 'List') {
                    result.push(makeHtmlList(thing));
                } else if (thing.type === 'Image') {
                    result.push('<mms-cf mms-cf-type="img" mms-element-id="' + thing.id + '"></mms-cf>');
                }
                result.push('</div>');
            }
            result.push('</li>');
        }
        if (list.ordered)
            result.push('</ol>');
        else
            result.push('</ul>');
        return result.join('');
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#makeHtmlPara
     * @methodOf mms.UtilsService
     *
     * @description
     * make html para string based on para spec object
     *
     * @param {object} para paragraph spec object
     * @returns {string} generated html string
     */
    var makeHtmlPara = function(para) {
        if (para.sourceType === 'text')
            return para.text;
        var t = 'doc';
        var attr = '';
        if (para.sourceProperty === 'name') {
            t = 'name';
        }
        if (para.sourceProperty === 'value') {
            t = 'val';
        }
        if (para.nonEditable) {
            attr = ' non-editable="' + para.nonEditable + '"';
        }
        //TODO update these to match mmsCF
        return '<mms-cf mms-cf-type="' + t + '" mms-element-id="' + para.source + '"' + attr + '></mms-cf>';
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#makeHtmlTOCChild
     * @methodOf mms.UtilsService
     *
     * @description
     * Generates table of contents for the document/views.
     *
     * @param {string} tree the root element (document or view)
     * @returns {string} toc string
     */
    var makeHtmlTOC = function (tree) {
        var result = '<div class="toc"><h1 class="header">Table of Contents</h1>';
        var root_branch = tree[0].branch;
        result += makeHtmlTOCChild(root_branch, true);
        result += '</div>';
        return result;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#makeHtmlTOCChild
     * @methodOf mms.UtilsService
     *
     * @description
     * Generates table of contents for the document/views.
     *
     * @param {string} child the view to be referenced in the table of content
     * @param {boolean} skip skip adding li for this branch
     * @returns {string} toc string
     */
    var makeHtmlTOCChild = function(branch, skip?) {
        var result = '';
        var child;
        if (!skip) {
            var anchor = '<a href=#' + branch.data.id + '>';
            result += '  <li>' + anchor + branch.data._veNumber + ' ' + branch.data.name + '</a>';
        }
        var ulAdded = false;
        for (var i = 0; i < branch.children.length; i++) {
            child = branch.children[i];
            if (child.type !== 'view' && child.type !== 'section') {
                continue;
            }
            if (!ulAdded) {
                result += '<ul>';
                ulAdded = true;
            }
            result += makeHtmlTOCChild(child);
        }
        if (ulAdded) {
            result += '</ul>';
        }
        if (!skip) {
            result += '</li>';
        }
        return result;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#makeTablesAndFiguresTOC
     * @methodOf mms.UtilsService
     *
     * @description
     * Generates a list of tables, figures, and equations. Default uses presentation elements.
     * `html` param provides option to use html content to generate list. It also appends the
     * captions to the figures and tables.
     *
     * @param {string} tree the document/view to be printed (what is on the left pane)
     * @param {string} printElement contents to be printed (what is displayed in the center pane)
     * @param {boolean} live true only if a specific sorting is required
     * @param {boolean} html whether to generated list of tables and figures using html content, outside of the corresponding PE or not
     * @returns {object} results
     */
    var makeTablesAndFiguresTOC = function(tree, printElement, live, html) {
        var ob = {
            tables: '',
            figures: '',
            equations: '',
            tableCount: 0,
            figureCount: 0,
            equationCount: 0
        };
        var root_branch = tree[0].branch;

        // If both "Generate List of Tables and Figures" && "Use HTML for List of Tables and Figures " options are checked...
        if (html) {
            ob = generateTOCHtmlOption(ob, tree, printElement);
            // return obHTML;
        } else {
            for (var i = 0; i < root_branch.children.length; i++) {
                makeTablesAndFiguresTOCChild(root_branch.children[i], printElement, ob, live, false);
            }
        }
        ob.tables    = ob.tables.length    ? '<div class="tot"><h1 class="header">List of Tables</h1><ul>'    + ob.tables    + '</ul></div>' : '';
        ob.figures   = ob.figures.length   ? '<div class="tof"><h1 class="header">List of Figures</h1><ul>'   + ob.figures   + '</ul></div>' : '';
        ob.equations = ob.equations.length ? '<div class="tof"><h1 class="header">List of Equations</h1><ul>' + ob.equations + '</ul></div>' : '';
        return ob;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#makeTablesAndFiguresTOCChild
     * @methodOf mms.UtilsService
     *
     * @description
     * Generates a list of tables, figures, and equations of the none root node of he tree (containment tree on the left pane). It also appends the captions to the figures and tables.
     *
     * @param {string} child presentation element
     * @param {string} printElement contents to be printed (what is displayed in the center pane)
     * @param {string} ob an object that stores the html list of tables, figures, and equations as well as the counts of those
     * @param {boolean} live true when user would like to preview numbering in the app
     * @param {boolean} showRefName the tree hierarchy of the document or view (what is displayed in the left pane)
     * @returns {void} nothing
     */
    var makeTablesAndFiguresTOCChild = function(child, printElement, ob, live, showRefName) {
        var pe = child.data;
        var sysmlId = pe.id;
        var veNumber = pe._veNumber;
        var prefix = '';
        var el = printElement.find('#' + sysmlId);
        var refs = printElement.find('mms-view-link[mms-pe-id="' + sysmlId + '"], mms-view-link[data-mms-pe-id="' + sysmlId + '"]');
        var cap = '';
        var name = '';
        if (child.type === 'table') {
            ob.tableCount++;
            prefix = 'Table ' + veNumber + '. ';
            var capTbl = el.find('table > caption');
            name = capTbl.text();
            if (name !== "" && name.indexOf('Table') === 0 && name.split('. ').length > 0) {
                name = name.substring(name.indexOf(prefix) + prefix.length);
            } else if (name === "") {
                name = pe.name;
            }
            cap = veNumber + '. ' + name;
            ob.tables += '<li><a href="#' + sysmlId + '">' + cap + '</a></li>';
            capTbl.html('Table ' + cap);
            // If caption does not exist, add to html
            if (capTbl.length === 0) {
                el.find('table').prepend('<caption>Table ' + cap + '</caption>');
            }
            // Change cap value based on showRefName true/false
            if (!showRefName) {
                cap = veNumber;
            }
            if (!live) {
                refs.find('a').attr('href', '#' + sysmlId);
            }
            refs.filter('[suppress-numbering!="true"]').filter(':not([link-text])').find('a').html('Table ' + cap);
        }
        if (child.type === 'figure') {
            ob.figureCount++;
            prefix = 'Figure ' + veNumber + '. ';
            var capFig = el.find('figure > figcaption');
            name = capFig.text();
            if (name !== "" && name.indexOf('Figure') === 0 && name.split('. ').length > 0) {
                name = name.substring(name.indexOf(prefix) + prefix.length);
            } else if (name === "") {
                name = pe.name;
            }
            cap = veNumber + '. ' + name;
            ob.figures += '<li><a href="#' + sysmlId + '">' + cap + '</a></li>';
            capFig.html('Figure ' + cap);
            // If caption does not exist, add to html
            if (capFig.length === 0) {
                el.find('img').wrap('<figure></figure>').after('<figcaption>Figure ' + cap + '</figcaption>');
            }
            // Change cap value based on showRefName true/false
            if (!showRefName) {
                cap = veNumber;
            }
            if (!live) {
                refs.find('a').attr('href', '#' + sysmlId);
            }
            refs.filter('[suppress-numbering!="true"]').filter(':not([link-text])').find('a').html('Fig. ' + cap);
        }
        if (child.type === 'equation') {
            ob.equationCount++;
            cap = veNumber + '. ' + pe.name;
            ob.equations += '<li><a href="#' + sysmlId + '">' + cap + '</a></li>';
            var equationCap = '(' + veNumber + ')';
            var capEq = el.find('.mms-equation-caption');
            capEq.html(equationCap);
            // If caption does not exist, add to html
            if (capEq.length === 0) {
                el.find('mms-view-equation > mms-cf > mms-transclude-doc > p').last().append('<span class="mms-equation-caption pull-right">' + equationCap + '</span>');
            }
            if (!live) {
                refs.find('a').attr('href', '#' + sysmlId);
            }
            refs.filter('[suppress-numbering!="true"]').filter(':not([link-text])').find('a').html('Eq. ' + equationCap);
        }
        for (var i = 0; i < child.children.length; i++) {
            makeTablesAndFiguresTOCChild(child.children[i], printElement, ob, live, showRefName);
        }
    };

    var addLiveNumbering = function(pe, el, type) {
        var veNumber = pe._veNumber;
        if (!veNumber) {
            return;
        }
        var prefix = '';
        var name = '';
        var cap = '';
        if (type === 'table') {
            prefix = 'Table ' + veNumber + '. ';
            var capTbl = el.find('table > caption');
            name = capTbl.text();
            if (name !== "" && name.indexOf('Table') === 0 && name.split('. ').length > 0) {
                name = name.substring(name.indexOf(prefix) + prefix.length);
            } else if (name === "") {
                name = pe.name;
            }
            cap = veNumber + '. ' + name;
            capTbl.html('Table ' + cap);
            // If caption does not exist, add to html
            if (capTbl.length === 0) {
                el.find('table').prepend('<caption>Table ' + cap + '</caption>');
            }
        }
        if (type === 'figure') {
            prefix = 'Figure ' + veNumber + '. ';
            var capFig = el.find('figure > figcaption');
            name = capFig.text();
            if (name !== "" && name.indexOf('Figure') === 0 && name.split('. ').length > 0) {
                name = name.substring(name.indexOf(prefix) + prefix.length);
            } else if (name === "") {
                name = pe.name;
            }
            cap = veNumber + '. ' + name;
            capFig.html('Figure ' + cap);
            // If caption does not exist, add to html
            if (capFig.length === 0) {
                el.find('img').wrap('<figure></figure>').after('<figcaption>Figure ' + cap + '</figcaption>');
            }
        }
        if (type === 'equation') {
            var equationCap = '(' + veNumber + ')';
            var capEq = el.find('.mms-equation-caption');
            capEq.html(equationCap);
            // If caption does not exist, add to html
            if (capEq.length === 0) {
                el.find('mms-view-equation > mms-cf > mms-transclude-doc > p').last().append('<span class="mms-equation-caption pull-right">' + equationCap + '</span>');
            }
        }
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#generateAnchorId
     * @methodOf mms.UtilsService
     *
     * @description
     * Generates a unique ID to be used in TOC anchor tags (e.g. <a name='tbl_xxxxx...x'>, <a href='#tbl_xxxxx...x'>)
     *
     * @param {string} prefix "tbl_" when creating an id for a table, "fig_" when creating an id for a figuer
     * @returns {string} unique ID wit prefix, tbl_ or fig_
     */
    var generateAnchorId = function(prefix){
        return prefix + ApplicationService.createUniqueId();
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#generateTOCHtmlOption
     * @methodOf mms.UtilsService
     *
     * @description
     * Generates a list of tables, figures, and equations. It also appends the captions to the figures and tables.
     *
     * @param {string} ob an object that stores the html list of tables, figures, and equations as well as the counts of those
     * @param {string} tree the tree hierarchy of the document or view (what is displayed in the left pane)
     * @param {string} printElement contents to be printed (what is displayed in the center pane)
     * @returns {string} populates the object fed to the function (the first argument) and return
     */
    var generateTOCHtmlOption = function(ob, tree, printElement){
        // Grab all existing tables and figures inside the center pane, and assign them to tables and figures
        var tables = printElement.find('table'),
            figures = printElement.find('figure');
            // equations = printElement.find('.math-tex');
        var anchorId = '', thisCap='', tblCap, tbl, fig, j;

        ob.tableCount = tables.length;
        ob.figureCount = figures.length;

        // Tables
        for ( j = 0; j < tables.length; j++) {
            tbl = $(tables[j]);
            tblCap = $('caption', tbl);

            // Set the link from the List of Tables to the actual tables
            anchorId = generateAnchorId('tbl_');
            tbl.attr('id', anchorId);

            // Append li to the List of Tables
            thisCap = (tblCap && tblCap.text() !== '') ? (j+1) + ". " + tblCap.text() : (j+1) + ". ";
            ob.tables += '<li><a href="#' + anchorId + '">' + thisCap + '</a></li>';

            // If no caption exists, add empty caption for numbering
            if (tblCap.length === 0) {
                tbl.prepend('<caption> </caption>');
            }
        }

        // Figures
        for ( j = 0; j < figures.length; j++) {
            fig = $(figures[j]);
            var figcap = $('figcaption',fig);

            // Set the link from the List of Tables to the actual tables
            anchorId = generateAnchorId('fig_');
            fig.attr('id', anchorId);

            // Append li to the List of Figures
            thisCap = (figcap && figcap.text() !== '') ? (j + 1) + ". " + figcap.text() : (j+1);
            ob.figures += '<li><a href="#' + anchorId + '">' + thisCap + '</a></li>';

            // If no caption exists, add empty caption for numbering
            if (figcap.length === 0) {
                fig.append('<figcaption>&nbsp;</figcaption>');
            }
        }

        // We will not add List of Equations for now
        // for ( j = 0; j < equations.length; j++) {
        //     // Grab all equations from the center pane
        //     eq = $(equations[j]);
        //
        //     // Set the link from the List of Tables to the actual tables
        //     anchorId = generateAnchorId('eq_');
        //     eq.attr('id', anchorId);
        //
        //     // Append li to the List of Equations
        //     ob.equations += '<li><a href="#' + anchorId + '">' + j + '. </a></li>';
        //     if(noCaption){ // If user did not add the caption, add a mock caption
        //         eq.append('<caption>&nbsp;</caption>');
        //     }
        // }
        return ob;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#createMmsId
     * @methodOf mms.UtilsService
     *
     * @description
     * Generate unique SysML element ID
     *
     * @returns {string} unique SysML element ID
     */
    var createMmsId = function() {
        var d = Date.now();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
        return 'MMS_' + Date.now() + '_' + uuid;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#convertViewLinks
     * @methodOf mms.UtilsService
     *
     * @description
     * Link the element to the document/view in VE (add an anchor tag)
     *
     * @param {string} printElement the content of the view/document currently selected on the center pane
     * @returns {void} nothing
     */
    var convertViewLinks = function(printElement) {
        printElement.find('mms-view-link').each(function(index) {
            var $this = $(this);
            var elementId = $this.attr('mms-element-id') || $this.attr('data-mms-element-id');
            if (!elementId) {
                return;
            }
            elementId = elementId.replace(/[^\w\-]/gi, '');
            var isElementInDoc = printElement.find("#" + elementId);
            if (isElementInDoc.length) {
                $this.find('a').attr('href','#' + elementId);
            }
        });
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#getPrintCss
     * @methodOf mms.UtilsService
     *
     * @description
     * Typeset HTML to PDF (resource: https://www.princexml.com/)
     *
     * @param {string} htmlFlag user input taken from the printConfirm modal: whether to include docGen generated tables and rapid tables, outside of the corresponding PE or not(<-- this comment needs to be approved by Shakeh)
     * @param {string} landscape user input taken from the printConfirm modal
     * @param {string} meta metadata about document/view {
                    'top-left': 'loading...', top: 'loading...', 'top-right': 'loading...',
                    'bottom-left': 'loading...', bottom: 'loading...', 'bottom-right': 'loading...'
                };
     * @returns {string} document/view content string to be passed to the server for conversion
     */
    var getPrintCss = function(htmlFlag, landscape, meta) {
        var ret = "/*------------------------------------------------------------------\n" +
                "Custom CSS Table of Contents\n" +
                "1. Images\n" +
                "2. Tables\n" +
                "3. Typography\n" +
                "   3.1 Diff\n" +
                "   3.2 Errors\n" +
                "4. Figure Captions\n" +
                "5. Table of Contents\n" +
                "6. Page Layout\n" +
                "7. Headers and Footers\n" +
                "8. Signature Box\n" +
                "9. Bookmark Level\n" +
                "------------------------------------------------------------------*/\n" +
                "\n" +
                "/*------------------------------------------------------------------\n" +
                "1. Images\n" +
                "------------------------------------------------------------------*/\n" +
                "img {max-width: 100%; page-break-inside: avoid; page-break-before: auto; page-break-after: auto; margin-left: auto; margin-right: auto;}\n" +
                "img.image-center {display: block;}\n" +
                "figure img {display: block;}\n" +
                ".pull-right {float: right;}\n" + 
                "\n" +
                "/*------------------------------------------------------------------\n" +
                "2. Tables\n" +
                "------------------------------------------------------------------*/\n" +
                " tr, td, th { page-break-inside: avoid; } thead {display: table-header-group;}\n" + 
                "table {width: 100%; border-collapse: collapse;}\n" + 
                "table, th, td {border: 1px solid black; padding: 4px; font-size: 10pt;}\n" +
                "table[border='0'], table[border='0'] th, table[border='0'] td {border: 0px;}\n" +
                "table, th > p, td > p {margin: 0px; padding: 0px;}\n" +
                "table, th > div > p, td > div > p {margin: 0px; padding: 0px;}\n" +
                "table mms-transclude-doc p {margin: 0 0 5px;}\n" +
                "th {background-color: #f2f3f2;}\n" + 
                //"table p {word-break: break-all;}\n" + 
                "\n" +
                "/*------------------------------------------------------------------\n" +
                "3. Typography\n" +
                "------------------------------------------------------------------*/\n" +
                "h1, h2, h3, h4, h5, h6 {font-family: 'Arial', sans-serif; margin: 10px 0; page-break-inside: avoid; page-break-after: avoid;}\n" +
                //"h1 {font-size: 18pt;} h2 {font-size: 16pt;} h3 {font-size: 14pt;} h4 {font-size: 13pt;} h5 {font-size: 12pt;} h6 {font-size: 11pt;}\n" +
                ".h1 {font-size: 18pt;} .h2 {font-size: 14pt;} .h3 {font-size: 12pt;} .h4 {font-size: 10pt;} .h5, .h6, .h7, .h8, .h9 {font-size: 9pt;}\n" +
                ".ng-hide {display: none;}\n" +
                ".chapter h1.view-title {font-size: 20pt; }\n" + 
                "body {font-size: 10pt; font-family: 'Times New Roman', Times, serif; }\n" + 
                "\n" +
                "/*------------------------------------------------------------------\n" +
                "   3.1 Diff\n" +
                "------------------------------------------------------------------*/\n" +
                "ins, .ins {color: black; background: #dafde0;}\n" +
                "del, .del{color: black;background: #ffe3e3;text-decoration: line-through;}\n" +
                ".match,.textdiff span {color: gray;}\n" +
                ".patcher-replaceIn, .patcher-attribute-replace-in, .patcher-insert, .patcher-text-insertion {background-color: #dafde0;}\n" +
                ".patcher-replaceIn, .patcher-attribute-replace-in, .patcher-insert {border: 2px dashed #abffb9;}\n" +
                ".patcher-replaceOut, .patcher-delete, .patcher-attribute-replace-out, .patcher-text-deletion {background-color: #ffe3e3; text-decoration: line-through;}\n" +
                ".patcher-replaceOut, .patcher-delete, .patcher-attribute-replace-out {border: 2px dashed #ffb6b6;}\n" +
                ".patcher-text-insertion, .patcher-text-deletion {display: inline !important;}\n" +
                "[class*=\"patcher-\"]:not(td):not(tr) {display: inline-block;}\n" +
                "\n" +
                "/*------------------------------------------------------------------\n" +
                "   3.2 Errors\n" +
                "------------------------------------------------------------------*/\n" +
                ".mms-error {background: repeating-linear-gradient(45deg,#fff,#fff 10px,#fff2e4 10px,#fff2e4 20px);}\n" +
                "\n" +
                "/*------------------------------------------------------------------\n" +
                "4. Figure Captions\n" +
                "------------------------------------------------------------------*/\n" +
                "caption, figcaption, .mms-equation-caption {text-align: center; font-weight: bold;}\n" +
                "table, figure {margin-bottom: 10px;}\n" +
                ".mms-equation-caption {float: right;}\n" +
                "mms-view-equation, mms-view-figure, mms-view-image {page-break-inside: avoid;}\n" +
                "\n" +
                "/*------------------------------------------------------------------\n" +
                "5. Table of Contents\n" +
                "------------------------------------------------------------------*/\n" +
                ".toc, .tof, .tot {page-break-after:always;}\n" +
                ".toc {page-break-before: always;}\n" +
                ".toc a, .tof a, .tot a { text-decoration:none; color: #000; font-size:9pt; }\n" + 
                ".toc .header, .tof .header, .tot .header { margin-bottom: 4px; font-weight: bold; font-size:24px; }\n" +
                ".toc ul, .tof ul, .tot ul {list-style-type:none; margin: 0; }\n" +
                ".tof ul, .tot ul {padding-left:0;}\n" +
                ".toc ul {padding-left:4em;}\n" +
                ".toc > ul {padding-left:0;}\n" +
                ".toc li > a[href]::after {content: leader('.') target-counter(attr(href), page);}\n" + 
                ".tot li > a[href]::after {content: leader('.') target-counter(attr(href), page);}\n" + 
                ".tof li > a[href]::after {content: leader('.') target-counter(attr(href), page);}\n" + 
                "\n" +
                "/*------------------------------------------------------------------\n" +
                "6. Page Layout\n" +
                "------------------------------------------------------------------*/\n" +
                "@page {margin: 0.5in;}\n" + 
                "@page landscape {size: 11in 8.5in;}\n" +
                ".landscape {page: landscape;}\n" +
                ".chapter {page-break-before: always}\n" + 
                "p, div {widows: 2; orphans: 2;}\n" +
                "\n" +
                "/*------------------------------------------------------------------\n" +
                "7. Headers and Footers\n" +
                "------------------------------------------------------------------*/\n" +
                "@page:first {@top {content: ''} @bottom {content: ''} @top-left {content: ''} @top-right {content: ''} @bottom-left {content: ''} @bottom-right {content: ''}}\n" +
                "\n" +
                "/*------------------------------------------------------------------\n" +
                "8. Signature Box\n" +
                "------------------------------------------------------------------*/\n" +
                ".signature-box td.signature-name-styling {width: 60%;}\n" + 
                ".signature-box td.signature-space-styling {width: 1%;}\n" + 
                ".signature-box td.signature-date-styling {width: 39%;}\n" + 
                "\n" +
                "/*------------------------------------------------------------------\n" +
                "9. Bookmark Level\n" +
                "------------------------------------------------------------------*/\n" ;
        for (var i = 1; i < 10; i++) {
            ret += ".h" + i + " {bookmark-level: " + i + ";}\n";
        }
        if (htmlFlag) {
            ret += ".toc { counter-reset: table-counter figure-counter;}\n" +
                "figure { counter-increment: figure-counter; }\n" +
                "figcaption::before {content: \"Figure \" counter(figure-counter) \". \"; }\n" +
                "table { counter-increment: table-counter; }\n" +
                "caption::before {content: \"Table \" counter(table-counter) \". \"; }\n";
        }
        Object.keys(meta).forEach(function(key) {
            if (meta[key]) {
                var content;
                if (meta[key] === 'counter(page)') {
                    content = meta[key];
                } else {
                    content = '"' + meta[key] + '"';
                }
                ret += '@page {@' + key + ' {font-size: 9px; content: ' + content + ';}}\n';
            }
        });
        if (landscape) {
            ret += "@page {size: 11in 8.5in;}";
        }
        return ret;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#isView
     * @methodOf mms.UtilsService
     *
     * @description
     * Evaluates if an given element is a view or not
     *
     * @param {Object} e element
     * @returns {boolean} boolean
     */
    var isView = function(e) {
        if (e._appliedStereotypeIds) {
            if (e._appliedStereotypeIds.indexOf(VIEW_SID) >= 0 || e._appliedStereotypeIds.indexOf(DOCUMENT_SID) >= 0) {
                return true;
            }
            for (var i = 0; i < OTHER_VIEW_SID.length; i++) {
                if (e._appliedStereotypeIds.indexOf(OTHER_VIEW_SID[i]) >= 0) {
                    return true;
                }
            }
        }
        return false;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#isDocument
     * @methodOf mms.UtilsService
     *
     * @description
     * Evaluates if an given element is a document or not
     *
     * @param {Object} e element
     * @returns {boolean} boolean
     */
    var isDocument = function(e) {
        if (e._appliedStereotypeIds && e._appliedStereotypeIds.indexOf(DOCUMENT_SID) >= 0) {
            return true;
        }
        return false;
    };

        /**
     * @ngdoc method
     * @name mms.UtilsService#isRequirement
     * @methodOf mms.UtilsService
     *
     * @description
     * Evaluates if an given element is a requirement from list given above: REQUIREMENT_SID
     *
     * @param {Object} e element
     * @returns {boolean} boolean
     */
    var isRequirement = function(e) {
        if (e._appliedStereotypeIds) {
            for (var i = 0; i < REQUIREMENT_SID.length; i++) {
                if (e._appliedStereotypeIds.indexOf(REQUIREMENT_SID[i]) >= 0) {
                    return true;
                }
            }
        }
        return false;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#exportHtmlAs
     * @methodOf mms.UtilsService
     *
     * @description
     * Converts HTML to PDF
     *
     * @param {string} exportType The export type (3 for pdf | 2 for word)
     * @param {Object} data contains htmlString, name, projectId, refId
     * @returns {Promise} Promise would be resolved with 'ok', the server will send an email to user when done
     */
    var exportHtmlAs = function(exportType, data){
        var accept;
        switch (exportType) {
          case 2:
              accept = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              break;
          case 3:
              accept = 'application/pdf';
              break;
          default:
              accept = 'application/pdf';
        }
        var deferred = $q.defer();
        $http.post(URLService.getExportHtmlUrl(data.projectId, data.refId, URLService.getRequestConfig()), {
            'Content-Type' : 'text/html',
            'Accepts' : accept,
            'body': data.htmlString,
            'name': data.name,
            'css': data.css
        })
        .then(function() {
            deferred.resolve('ok');
        }, function(error) {
            URLService.handleHttpStatus(error.data, error.status, error.headers, error.config, deferred);
        });
        return deferred.promise;
    };

    /**
     * @ngdoc method
     * @name mms.UtilsService#createClassElement
     * @methodOf mms.UtilsService
     *
     * @description
     * returns a class json object with all emf fields set to default, with
     * fields from passed in object substituted
     * 
     */
    var createClassElement = function(obj) {
        var o = JSON.parse(JSON.stringify(CLASS_ELEMENT_TEMPLATE));
        Object.assign(o, obj);
        return o;
    };

    var createInstanceElement = function(obj) {
        var o = JSON.parse(JSON.stringify(INSTANCE_ELEMENT_TEMPLATE));
        Object.assign(o, obj);
        return o;
    };

    var createValueSpecElement = function(obj) {
        var o = JSON.parse(JSON.stringify(VALUESPEC_ELEMENT_TEMPLATE));
        Object.assign(o, obj);
        return o;
    };

    var createGeneralizationElement = function(obj) {
        var o = JSON.parse(JSON.stringify(GENERALIZATION_ELEMENT_TEMPLATE));
        Object.assign(o, obj);
        return o;
    };

    var createPackageElement = function(obj) {
        var o = JSON.parse(JSON.stringify(PACKAGE_ELEMENT_TEMPLATE));
        Object.assign(o, obj);
        return o;
    };

    var createDependencyElement = function(obj) {
        var o = JSON.parse(JSON.stringify(DEPENDENCY_ELEMENT_TEMPLATE));
        Object.assign(o, obj);
        return o;
    };

    var copyToClipboard = function(target, $event) {
        $event.stopPropagation();
        var range = window.document.createRange();
        range.selectNodeContents(target[0].childNodes[0]);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        try {
            window.document.execCommand('copy');
        } catch(err) {}
        window.getSelection().removeAllRanges();
    };

    var getElementTypeClass = function(element, elementType) {
        var elementTypeClass = '';
        if (element.type === 'InstanceSpecification') {
            elementTypeClass = 'pe-type-' + elementType;
        } else {
            elementTypeClass = 'item-type-' + elementType;
        }
        return elementTypeClass;
    };

    return {
        VIEW_SID: VIEW_SID,
        OTHER_VIEW_SID: OTHER_VIEW_SID,
        DOCUMENT_SID: DOCUMENT_SID,
        BLOCK_SID: BLOCK_SID,
        createClassElement: createClassElement,
        createInstanceElement: createInstanceElement,
        createValueSpecElement: createValueSpecElement,
        createGeneralizationElement: createGeneralizationElement,
        createDependencyElement: createDependencyElement,
        createPackageElement: createPackageElement,
        hasCircularReference: hasCircularReference,
        cleanElement: cleanElement,
        normalize: normalize,
        makeElementKey: makeElementKey,
        makeArtifactKey: makeArtifactKey,
        buildTreeHierarchy: buildTreeHierarchy,
        filterProperties: filterProperties,
        mergeElement: mergeElement,
        hasConflict: hasConflict,
        isRestrictedValue: isRestrictedValue,
        makeHtmlTable : makeHtmlTable,
        makeHtmlPara: makeHtmlPara,
        makeHtmlList: makeHtmlList,
        makeHtmlTOC: makeHtmlTOC,
        makeTablesAndFiguresTOC: makeTablesAndFiguresTOC,
        addLiveNumbering: addLiveNumbering,
        convertViewLinks: convertViewLinks,
        createMmsId: createMmsId,
        getPrintCss: getPrintCss,
        isView: isView,
        isDocument: isDocument,
        isRequirement: isRequirement,
        exportHtmlAs: exportHtmlAs,
        generateTOCHtmlOption: generateTOCHtmlOption,
        generateAnchorId: generateAnchorId,
        tableConfig: tableConfig,
        _generateRowColNumber: _generateRowColNumber,
        PROJECT_URL_PREFIX: PROJECT_URL_PREFIX,
        copyToClipboard: copyToClipboard,
        getElementTypeClass: getElementTypeClass
    };
}
