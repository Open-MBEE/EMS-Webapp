import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsViewTable', ['$compile', '$timeout', '$document', '$window', 'UtilsService', 'Utils', mmsViewTable]);

function mmsViewTable($compile, $timeout, $document, $window, UtilsService, Utils) {

    var mmsViewTableLink = function(scope, element, attrs, ctrl) {
        if (!scope.table.showIfEmpty && scope.table.body.length === 0)
            return;

        var tableConfig = UtilsService.tableConfig;

        scope.searchTerm = '';
        scope.showFilter = false;
        scope.showSortReset = false;
        scope.isAscending = false;
        scope.getSortIconClass = function(cellColumn) {
            var sortingColumnNumber = scope[tableConfig.showBindingForSortIcon];
            if ( sortingColumnNumber !== cellColumn ) {
                return ['fa', 'fa-sort', 'sort-default' ];
            } else {
                if ( scope.isAscending ) {
                    return ['fa', 'fa-caret-down', 'sort-activated' ];
                } else {
                    return ['fa', 'fa-caret-up', 'sort-activated' ];
                }
            }
        };

        var html = UtilsService.makeHtmlTable(scope.table, true, true, scope.mmsPe);
        html = '<div class="tableSearch ve-table-filter">' +
                '<button class="btn btn-sm export-csv-button btn-default" ng-click="makeCsv()">Export CSV</button> ' +
                '<button class="btn btn-sm filter-table-button btn-default" ng-click="showFilter = !showFilter">Filter table</button> ' +
                '<label class="btn btn-sm btn-default table-button"><input type="checkbox" class="fixed-header-checkbox" ng-model="fixedHeaders" ng-change="makeFixedHeader()" /> Freeze Headers</label> ' +
                '<label class="btn btn-sm btn-default table-button"><input type="checkbox" class="fixed-header-checkbox" ng-model="fixedColumns" ng-change="makeFixedColumn()" /> Freeze Columns</label> ' +
                '<label class="btn btn-sm table-button column-input-label" ng-show="fixedColumns">Columns to Freeze <input type="text" ng-show="fixedColumns" size="3" class="column-input" ng-model="numFixedColumns" /></label> ' +
                '<button class="btn btn-sm btn-default table-button" ng-show="fixedColumns" ng-click="updateFixedColumns()">Update</button> ' +
                '<button class="btn btn-sm reset-sort-button btn-default reset-sort-fade" ng-show="showSortReset" ng-click="resetSort()">Reset Sort</button>' +
                '<span class = "ve-show-filter" ng-show="showFilter">' +
                    '<form style="display: inline" class="ve-filter-table-form"><input type="text" size="75" placeholder="Filter table" ng-model-options="{debounce: '+ tableConfig.filterDebounceRate  + '}" ng-model="searchTerm"></form>' +
                '<span class = "ve-filter-status">Showing <strong>{{numFiltered}}</strong> of <strong>{{numTotal}}</strong> Rows: </span></span></div>' + 
                '<div class="table-wrapper">' + html + '</div>';

        scope.makeCsv = function() {
            var csvString = element.find('.table-wrapper').children('table').table2CSV({delivery:'value'});
            // var bom = "\xEF\xBB\xBF"; //just for excel
            var bom2 = "\uFEFF";      //just for excel
            var blob = new Blob([bom2 + csvString], {
                    type: "text/csv;charset=utf-8;"
                });

            if (window.navigator.msSaveOrOpenBlob) {
                navigator.msSaveBlob(blob,'TableData.csv');
            } else {
                var downloadContainer = angular.element('<div data-tap-disabled="true"><a></a></div>');
                var downloadLink = angular.element(downloadContainer.children()[0]);
                downloadLink.attr('href', window.URL.createObjectURL(blob));
                downloadLink.attr('download', 'TableData.csv');
                downloadLink.attr('target', '_blank');

                $document.find('body').append(downloadContainer);
                $timeout(function () {
                    downloadLink[0].click();
                    downloadLink.remove();
                }, null);
            }
        };

        var fixedHeaders = null;
        scope.fixedHeaders = false;
        var fixedColumns = null;
        scope.fixedColumns = false;
        scope.numFixedColumns = 2;
        var scroll = function() {
            if (fixedColumns) {
                fixedColumns.css('transform', 'translateX('+ this.scrollLeft +'px)');
            }
            if (fixedHeaders) {
                fixedHeaders.css('transform', 'translateY('+ this.scrollTop +'px)');
            }
            if (fixedHeaders && fixedColumns) {
                element.find('caption').css('transform', 'translate(' + this.scrollLeft + 'px, ' + this.scrollTop + 'px)');
            }
        };
        scope.makeFixedHeader = function() {
            if (!scope.fixedHeaders) {
                element.find('.table-wrapper').removeClass('table-fix-head').css('height', '');
                fixedHeaders.css('transform', '').css('will-change', '');
                fixedHeaders = null;
                $window.localStorage.setItem('ve-table-header-' + scope.mmsPe.id, 'false');
                return;
            }
            element.find('.table-wrapper').addClass('table-fix-head').css('height', $window.innerHeight - 36*3);
            //heights for navbar, menu, toolbar
            fixedHeaders = element.find('thead, caption');
            fixedHeaders.css('will-change', 'transform'); //browser optimization
            element.find('.table-fix-head').on('scroll', scroll);
            $window.localStorage.setItem('ve-table-header-' + scope.mmsPe.id, 'true');
        };
        scope.makeFixedColumn = function() {
            if (!scope.fixedColumns) {
                element.find('.table-wrapper').removeClass('table-fix-column').css('width', '');
                fixedColumns.css('transform', '').css('will-change', '').removeClass('table-fixed-cell');
                fixedColumns = null;
                $window.localStorage.setItem('ve-table-column-' + scope.mmsPe.id, 'false');
                return;
            }
            element.find('.table-wrapper').addClass('table-fix-column').css('width', $window.innerWidth - 400);
            fixedColumns = findColumnCells('thead', 'th', scope.numFixedColumns);
            fixedColumns = fixedColumns.add(findColumnCells('tbody', 'td', scope.numFixedColumns));
            fixedColumns = fixedColumns.add(element.find('.table-fix-column caption'));
            fixedColumns.css('will-change', 'transform'); //browser optimization
            fixedColumns.addClass('table-fixed-cell');
            element.find('.table-fix-column').on('scroll', scroll);
            $window.localStorage.setItem('ve-table-column-' + scope.mmsPe.id, scope.numFixedColumns);
        };
        scope.updateFixedColumns = function() {
            scope.fixedColumns = false;
            scope.makeFixedColumn();
            scope.fixedColumns = true;
            scope.makeFixedColumn();
        };
        var findColumnCells = function(bodyTag, cellTag, n) {
            var spanData = {}; //if spanData[curRow][curCol] is true that means that 'cell' should be "" due to merged cell
            var curRow = 0;
            var data = $();
            element.find('.table-fix-column table').children(bodyTag).children('tr').each(function() {
                var curCol = 0;
                $(this).children(cellTag).each(function() {
                    while(spanData[curRow] && spanData[curRow][curCol]) {
                        curCol++;
                    }
                    if (curCol >= n) {
                        return;
                    }
                    data = data.add($(this));
                    var rowstring = $(this).attr('rowspan');
                    if (rowstring) {
                        var rowspan = parseInt(rowstring);
                        if (rowspan > 1) {
                            for (var i = 1; i < rowspan; i++) {
                                if (!spanData[curRow + i]) {
                                    spanData[curRow + i] = {};
                                }
                                spanData[curRow + i][curCol] = true;
                            }
                        }
                    }
                    var colstring = $(this).attr('colspan');
                    if (!colstring) {
                        curCol++;
                        return;
                    }
                    var colspan = parseInt(colstring);
                    while (colspan > 1) {
                        curCol++;
                        colspan--;
                        if (rowspan > 1) {
                            for (var j = 1; j < rowspan; j++) {
                                spanData[curRow + j][curCol] = true;
                            }
                        }
                    }
                    curCol++;
                });
                curRow++;
            });
            return data;
        };

        element[0].innerHTML = html;
        $(element[0]).find('img').each(function(index) {
            Utils.fixImgSrc($(this));
        });
        var nextIndex = 0;
        var thead = element.find('thead');
        $compile(thead)(scope);
        var searchbar = element.children('div')[0];
        $compile(searchbar)(scope);
        $compile(element.find('caption'))(scope);
        //Add the search input here (before the TRS, aka the columns/rows)
        var tbody = element.find('.table-wrapper').children('table').children('tbody');
        var trs = tbody.children('tr');

        var lastIndex = trs.length;
        scope.numFiltered = lastIndex;
        scope.numTotal = lastIndex;
        function compile() {
            $timeout(function() {
                var first = nextIndex;
                if (first > lastIndex)
                    return;
                var now = trs.slice(first, first + 300);
                $compile(now)(scope);
                nextIndex = first + 300;
                if (nextIndex < lastIndex)
                    compile();
                else {
                    if ($window.localStorage.getItem('ve-table-header-' + scope.mmsPe.id) == 'true') {
                        scope.fixedHeaders = true;
                        scope.makeFixedHeader();
                    }
                    var columnFix = $window.localStorage.getItem('ve-table-column-' + scope.mmsPe.id);
                    if (columnFix != 'false' && columnFix != null && columnFix != 'null') {
                        scope.fixedColumns = true;
                        scope.numFixedColumns = columnFix;
                        scope.makeFixedColumn();
                    }
                }
            }, 100, false);
        }
        compile();

        ctrl.addFullTableFilter(trs);
        ctrl.addColumnsWiseFilter(tableConfig, trs);
        ctrl.addSorting(trs, tbody);
    };

    var mmsViewTableController = ['$scope', function ($scope) {
        var vm = this;

        /** Full Table Filter **/
        vm.addFullTableFilter = addFullTableFilter;
        vm._addWatcherToFullTableFilterInput = _addWatcherToFullTableFilterInput;
        vm._displaySomeRows = _displaySomeRows;
        vm._fullTableFilter = _fullTableFilter;

        /** Add Full Table Filter ability **/
        function addFullTableFilter(trs) {
            vm._fullTableFilterWatcherUnregisterFn = vm._addWatcherToFullTableFilterInput(function(){vm._fullTableFilter(trs);});
        }

        /** Add a watcher to the Full Table Filter Input **/
        function _addWatcherToFullTableFilterInput(performFilter) {
            return $scope.$watch('searchTerm', function (newInputVal, oldInputVal) {
                if (newInputVal !== oldInputVal) {
                    performFilter();
                }
            });
        }

        /** Filter rows by search term **/
        function _fullTableFilter(trs) {
            vm._resetColumnWiseFilterInputs();
            if ( $scope.searchTerm === '' ) {
                $scope.numFiltered = trs.length;
                trs.show();
            } else {
                $scope.numFiltered = 0;
                vm._displaySomeRows(trs, function() { $scope.numFiltered++; });
            }
        }

        /** Display rows that match the filter term **/
        function _displaySomeRows(trs, increaseNumOfRowToShow) {
            var searchTerm = $scope.searchTerm;
            var regExp = new RegExp(searchTerm, 'i');
            for (var i = 0, numRows = trs.length; i < numRows; i++) {
                var string = $(trs[i]).text();
                if (regExp.test(string)) {
                    $(trs[i]).show();
                    increaseNumOfRowToShow();
                } else {
                    $(trs[i]).hide();
                }
            }
        }
        /** End of Full Table Filter **/



        /** Column(s)-Wise Filter **/
        vm.addColumnsWiseFilter = addColumnsWiseFilter;
        vm._addWatchersForAllHeaderColumnsInput = _addWatchersForAllHeaderColumnsInput;
        vm._addWatcherToColumnInput = _addWatcherToColumnInput;
        vm._displayRowsMatchingAllColumnsFilterTerms = _displayRowsMatchingAllColumnsFilterTerms;
        vm._storeColumnWiseFilterTerm = _storeColumnWiseFilterTerm;
        vm._addNewColumnWiseFilterTerm = _addNewColumnWiseFilterTerm;
        vm._updateExistingColumnWiseFilterTerm = _updateExistingColumnWiseFilterTerm;
        vm._getCellValueForFiltering = _getCellValueForFiltering;
        vm._resetColumnWiseFilterInputs = _resetColumnWiseFilterInputs;
        vm._resetFullTableFilterInput = _resetFullTableFilterInput;

        /** Add column(s)-wise filter ability **/
        function addColumnsWiseFilter(tableConfig, trs) {
            vm._columnsInputWatchers = vm._addWatchersForAllHeaderColumnsInput(tableConfig);
            /**
             * _filterTermForColumns is used to keep track of filter terms on each header's column for multi-columns
             * filtering. Some header columns could be a merged column, and have children columns. "columns" property
             * keeps track, of all the children columns number that it is a parent of. ie:
             * {filterTermForColumn01: {filterTerm: 'A', columns: [0,1}], filterTermForColumn11: {filterTerm: 'B', columns: [1}]} **/
            vm._filterTermForColumns = {};
            $scope.filterByColumn = function (filterTerm, startColNum, endColNum, filterInputBinding) {
                vm._resetFullTableFilterInput(trs);
                vm._storeColumnWiseFilterTerm(vm._filterTermForColumns, filterInputBinding, startColNum, endColNum, filterTerm);
                $scope.numFiltered = 0;
                vm._displayRowsMatchingAllColumnsFilterTerms(trs, vm._filterTermForColumns, function() {$scope.numFiltered++;});
            };
        }

        /** Add watchers to all header columns inputs for filtering **/
        function _addWatchersForAllHeaderColumnsInput(tableConfig) {
            var columnsInputWatchers = {};
            if (!$scope.table.header) {
                return;
            }
            $scope.table.header.forEach(function (headerRow) {
                headerRow.forEach(function(cell) {
                    var filterInputBinding = tableConfig.filterTermColumnPrefixBinding + cell.startCol + cell.endCol;
                    vm._addWatcherToColumnInput(columnsInputWatchers, filterInputBinding, cell );
                });
            });
            return columnsInputWatchers;
        }

        /** Add a watcher to one header column's input for filtering **/
        function _addWatcherToColumnInput(columnsInputWatchers, filterInputBinding, cell) {
            columnsInputWatchers[filterInputBinding] = {
                deRegistration: $scope.$watch(filterInputBinding, function (newInputVal, oldInputVal) {
                    if (newInputVal !== oldInputVal) {
                        $scope.filterByColumn(newInputVal, cell.startCol, cell.endCol, filterInputBinding);
                    }
                }),
                cell: cell
            };
        }

        /** Clear out the filter term from the Full Table Filter input **/
        function _resetFullTableFilterInput(trs) {
            if ($scope.searchTerm !== '') {
                vm._fullTableFilterWatcherUnregisterFn();
                $scope.searchTerm = '';
                vm._fullTableFilterWatcherUnregisterFn = vm._addWatcherToFullTableFilterInput(function(){vm._fullTableFilter(trs);});
            }
        }

        /** Only show the rows that has contents matching all currently outstanding filter terms **/
        function _displayRowsMatchingAllColumnsFilterTerms(trs, filterTermForColumns, increaseNumOfRowToShow) {
            trs.toArray().forEach(function (row) {
                var shouldKeepRow = Object.keys(filterTermForColumns).every(function(k) {
                    var regExp = new RegExp(filterTermForColumns[k].filterTerm, 'i');
                    return filterTermForColumns[k].columns.some(function(colNum) {
                        return regExp.test(vm._getCellValueForFiltering(row, colNum));
                    });
                });
                if (shouldKeepRow) {
                    $(row).show();
                    increaseNumOfRowToShow();
                } else {
                    $(row).hide();
                }
            });
        }

        /** Update or add a new filter term for a header column with the given filterInputBinding **/
        function _storeColumnWiseFilterTerm(filterTermForColumns, filterInputBinding, startColNum, endColNum, filterTerm) {
            if (filterTermForColumns[filterInputBinding]) {
                vm._updateExistingColumnWiseFilterTerm(filterTermForColumns, filterInputBinding, filterTerm);
            } else {
                vm._addNewColumnWiseFilterTerm(filterTermForColumns, filterInputBinding, startColNum, endColNum, filterTerm);
            }
        }

        /** Add a new filter term to a header column with the given filterInputBinding **/
        function _addNewColumnWiseFilterTerm(filterTermForColumns, filterInputBinding, startColNum, endColNum, filterTerm) {
            filterTermForColumns[filterInputBinding] = {filterTerm: filterTerm, columns: startColNum === endColNum ? [startColNum] : [startColNum, endColNum] };
        }

        /** Update a filter term for a header column with the given filterInputBinding **/
        function _updateExistingColumnWiseFilterTerm(filterTermForColumns, filterInputBinding, filterTerm) {
            filterTermForColumns[filterInputBinding].filterTerm = filterTerm;
        }

        /** Return the content of a cell given a row & columnIndex **/
        function _getCellValueForFiltering(row, columnIndex) {
            var cell = $(row).children('td').eq(columnIndex);
            return cell.text().trim();
        }

        /** Clear out filter term(s) for all header's columns that used to be filtered by before **/
        function _resetColumnWiseFilterInputs() {
            var listOfFilterInputBindings = Object.keys(vm._filterTermForColumns);
            if ( listOfFilterInputBindings.length > 0 ) {
                listOfFilterInputBindings.forEach(function(filterInputBinding) {
                    if (vm._filterTermForColumns[filterInputBinding].filterTerm !== '' ) {
                        vm._columnsInputWatchers[filterInputBinding].deRegistration();
                    }
                    $scope[filterInputBinding] = '';
                    vm._addWatcherToColumnInput(vm._columnsInputWatchers, filterInputBinding, vm._columnsInputWatchers[filterInputBinding].cell );
                });
                vm._filterTermForColumns = {};
            }
        }
        /** End of Column(s)-Wise Filter **/



        /** Sorting feature **/
        vm.addSorting = addSorting;
        vm._addDefaultSortOrder = _addDefaultSortOrder;
        vm._addSortingBinding = _addSortingBinding;
        vm._addSortResetBinding = _addSortResetBinding;
        vm._comparator = _generalComparator;
        vm._getCellValueForSorting = _getCellValueForSorting;
        vm._displaySortedRows = _displaySortedRows;
        vm._comparatorForSortReset = _comparatorForSortReset;
        vm._rowSortOrderAttrName = 'data-original-row-num';
        vm.__areAllCellValidNumber = _areAllCellValidNumber;

        /** Add sorting ability **/
        function addSorting(trs, tbody) {
            vm._addDefaultSortOrder(trs);
            vm._addSortingBinding(trs, tbody);
            vm._addSortResetBinding(trs, tbody);
        }

        /** Remember the original row number for each row. Used to restore sort order **/
        function _addDefaultSortOrder(trs) {
            trs.each(function (rowNumber, tr) {
                $(tr).attr(vm._rowSortOrderAttrName, rowNumber );
            });
        }

        /** Used to sort columns(s). Add sort binding to each header columns of the outermost table **/
        function _addSortingBinding(trs, tbody) {
            var tableConfig = UtilsService.tableConfig;

            $scope[tableConfig.showBindingForSortIcon] = -1;

            $scope[tableConfig.sortByColumnFn] = function (sortColumnNum) {
                $scope[tableConfig.showBindingForSortIcon] = sortColumnNum;
                var rows = trs.toArray();
                var sortedRows = _areAllCellValidNumber(rows, sortColumnNum) ?
                    rows.sort(_numericalComparator(sortColumnNum)) : rows.sort(_generalComparator(sortColumnNum));

                $scope.isAscending = !$scope.isAscending;

                if (!$scope.isAscending) {
                    sortedRows = sortedRows.reverse();
                }

                vm._displaySortedRows(sortedRows, tbody);
                $scope.showSortReset = true;
            };
        }

        /** Used to restore the sort order of table's rows **/
        function _addSortResetBinding(trs, tbody) {
            $scope.resetSort = function() {
                var sortedRows = trs.toArray().sort(vm._comparatorForSortReset());
                vm._displaySortedRows(sortedRows, tbody);

                $scope.showSortReset = false;
                $scope[UtilsService.tableConfig.showBindingForSortIcon] = -1;
            };
        }

        /** A comparator for sorting table's rows. When one of them is null ( null is reserved for non-sortable content
         *  such as  image, list, table ), that content is pushed to the end of the final sorted list regardless of
         *  whether sorting asc or dsc **/
        function _generalComparator(columnIndex) {
            return function(rowA, rowB) {
                var cellValueA = _getCellValueForSorting(rowA, columnIndex);
                var cellValueB = _getCellValueForSorting(rowB, columnIndex);

                if (cellValueA === null && cellValueB === null) {
                    return 0;
                }

                if (cellValueA === null && cellValueB !== null) {
                    return $scope.isAscending ? 1 : -1;
                }

                if (cellValueA !== null && cellValueB === null) {
                    return $scope.isAscending ? -1 : 1;
                }

                if (cellValueA !== null && cellValueB !== null) {
                    cellValueA = cellValueA.toLowerCase();
                    cellValueB = cellValueB.toLowerCase();
                    return cellValueA < cellValueB ? -1 : cellValueA > cellValueB ? 1 : 0;
                }
            };
        }

        /** Return true if and only if all cells' value can be converted to a valid number **/
        function _areAllCellValidNumber(rows, columnIndex) {
            return rows.every(function(row) {
                return _isValidNumber(_getCellValueForSorting(row, columnIndex));
            });
        }

        function _numericalComparator(columnIndex) {
            return function(rowA, rowB) {
                var cellValueA = Number(_getCellValueForSorting(rowA, columnIndex));
                var cellValueB = Number(_getCellValueForSorting(rowB, columnIndex));
                return cellValueA - cellValueB;
            };
        }

        function _isValidNumber(val) {
            return val !== null && !isNaN(Number(val));
        }

        /** Get content of a cell given its row and its columnIndex. Return null for a cell that contains non-sortable
         *  content such as image, table, list **/
        function _getCellValueForSorting(row, columnIndex) {
            var cell = $(row).children('td').eq(columnIndex);
            var containerDivContent = cell.children('div').contents();
            // if there is no content, think of it as empty string
            if (containerDivContent.length === 0) {
                return '';
            } else if(!containerDivContent.prop('tagName')) {
                return cell.text().trim();
            } else {
                var cf = 'mms-cf';
                var contentTag = containerDivContent.prop('tagName').toLowerCase();
                var contentTagAttr = containerDivContent.attr('mms-cf-type');
                if ( contentTag === 'img' || contentTag === 'table' || contentTag === cf && ( contentTagAttr === 'img' || contentTagAttr === 'table' )) {
                    return null;
                } else {
                    return cell.text().trim();
                }
            }
        }

        /** Display newly sorted rows **/
        function _displaySortedRows(sortedRows, tbody) {
            $(sortedRows).detach().appendTo(tbody);
        }

        /** This special comparator is used to turn the table's rows into its original sort order **/
        function _comparatorForSortReset() {
            return function(rowA, rowB) {
                var rowARowNumber = Number($(rowA).attr(vm._rowSortOrderAttrName));
                var rowBRowNumber = Number($(rowB).attr(vm._rowSortOrderAttrName));
                return rowARowNumber < rowBRowNumber ? -1 : rowARowNumber > rowBRowNumber ? 1 : 0;
            };
        }
        /** End of Sorting feature **/
    }];

    return {
        restrict: 'E',
        scope: {
            table: '<mmsTable',
            mmsPe: '<'
        },
        controller: mmsViewTableController,
        link: mmsViewTableLink
    };
}
