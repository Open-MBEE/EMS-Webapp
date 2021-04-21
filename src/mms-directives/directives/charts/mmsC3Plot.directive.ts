import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsC3Plot', ['TableService', '$window', '_', mmsC3Plot]);
function mmsC3Plot(TableService, $window, _) {
      
  var mmsChartLink = function(scope, element, attrs, mmsViewCtrl) {

    var c3 = $window.c3;
    var d3 = $window.d3;
    var divchart = d3.select(element[0]).append('div');

    var projectId;
    var refId;
    var commitId;

    if (mmsViewCtrl) {
      var viewVersion = mmsViewCtrl.getElementOrigin();
      projectId = viewVersion.projectId;
      refId = viewVersion.refId;
      commitId = viewVersion.commitId;
    }

    /**
     * for any value that's not an object, assume it's a function string, 
     * eval it and assign to same key
     * @param {*} object 
     */
    function simplifyFunctions(object){
      _.forOwn(object, function(value, key, ob) {
        if (_.isPlainObject(value)) {
          simplifyFunctions(value);
        } else {
          ob[key] = eval('(' + value + ')');
        }
      });
    }

    function vf_pplot(c3json, c3jfunc) { 
      if (c3jfunc && _.isPlainObject(c3jfunc)) {
        simplifyFunctions(c3jfunc);
        _.merge(c3json, c3jfunc);
      }
      c3.generate(c3json);
    }
  
    scope.render = function() {
      TableService.readvalues(scope.plot, projectId, refId, commitId)
      .then( function(value) {
          scope.valuesO = value.tablebody.valuesO; //value objects used in watch
          var c3options;
          if (value.tablebody.c3_data.length === 0) { //no data
            return;
          }
          if ( scope.plot.config.options === undefined || scope.plot.config.options.length === 0 ){
            if (value.isHeader)
              c3options = {data: {x: "x", type: "line"}, axis : {x: {type:"category", tick:{centered:true}}}};
            else 
              c3options = {data: {}};
          }
          else
              c3options = scope.plot.config.options;
          if ( value.tablebody.c3_data.length === scope.plot.table.body.length && 
              c3options.data.xs === undefined && value.isHeader){
              value.tablebody.c3_data.unshift(['x'].concat(value.tableheader));
          }
          c3options.data.columns = value.tablebody.c3_data;

          var c3jfunc;
          if (scope.plot.config.functions) {
            c3jfunc = scope.plot.config.functions;
          }
          divchart.selectAll('*').remove();
          divchart.attr("id", 'c3chart' + scope.$id);
          c3options.bindto = '#c3chart' + scope.$id;
        
          vf_pplot(c3options, c3jfunc); 
      });
    };//end of render

  
    scope.$watch('valuesO', function(newVals, oldVals) {
        return scope.render();
    }, true);
  }; //end of link

  return {
    restrict: 'EA',
    require: '?^mmsView',
     scope: {
      plot: '<'
    },
    link: mmsChartLink
  }; //return
}



