import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsD3NormalizedStackedBarPlot', ['TableService','$window', mmsD3NormalizedStackedBarPlot]);
  
  /**
  /* reference https://bl.ocks.org/mbostock/3886394
  */
  function mmsD3NormalizedStackedBarPlot(TableService, $window) {
      
    var mmsChartLink = function(scope, element, attrs, mmsViewCtrl) {
      
      var d3 = $window.d3;

      var divchart = d3.select(element[0]).append('div');
      //default 
      var defaultPlotConfig = {width : 960 /*parseInt(divchart.style("width"))*0.95*/, height: 500, 
        marginTop:20, marginRight:60, marginBottom:30, marginLeft:40};
      var plotId= "d3nbplot" + scope.$id;

      var projectId, refId, commitId;
      if (mmsViewCtrl) {
        var viewVersion = mmsViewCtrl.getElementOrigin();
        projectId = viewVersion.projectId;
        refId = viewVersion.refId;
        commitId = viewVersion.commitId;
      }

  function vf_pplot() {

    divchart.selectAll('*').remove();
    divchart.attr("id", plotId);
    var svg = divchart.append("svg:svg");

    var plotConfig = TableService.plotConfig(scope.plot.config.options, defaultPlotConfig);
    svg.attr("width", plotConfig.width);
    svg.attr("height", plotConfig.height);
    var margin = {top: plotConfig.marginTop, right: plotConfig.marginRight, 
      bottom: plotConfig.marginBottom, left: plotConfig.marginLeft},

    width = +svg.attr("width") - margin.left - margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom,
    g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
 
    var x = d3.scaleBand()
      .rangeRound([0, width])
      .padding(0.1)
      .align(0.1);

    var y = d3.scaleLinear()
        .rangeRound([height, 0]);

    var z = d3.scaleOrdinal(d3.schemeCategory10);

    var stack = d3.stack()
        .offset(d3.stackOffsetExpand);
     
    var data = scope.tablebody.c3_data;
    data = total(data);
    data.sort(function(a, b) { 
      return b[scope.tablecolumnheader[0]] / b.total - a[scope.tablecolumnheader[0]] / a.total; 
    });
   
    x.domain(data.map(function(d) { return d.rowheader; })); 
    z.domain(scope.tablecolumnheader);

    var serie = g.selectAll(".serie")
      .data(stack.keys(scope.tablecolumnheader)(data))
      .enter().append("g")
      .attr("class", "serie")
      .attr("fill", function(d) { return z(d.key); });

    serie.selectAll("rect")
      .data(function(d) { return d; })
      .enter().append("rect")
      .attr("x", function(d) { return x(d.data.rowheader); })
      .attr("y", function(d) { return y(d[1]); })
      .attr("height", function(d) { return y(d[0]) - y(d[1]); })
      .attr("width", x.bandwidth());

    g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));

    g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(y).ticks(10, "%"));

    var legend = serie.append("g")
      .attr("class", "legend")
      .attr("transform", function(d) {
         d = d[d.length - 1]; 
         return "translate(" + (x(d.data.rowheader) + x.bandwidth()) + "," + ((y(d[0]) + y(d[1])) / 2) + ")"; 
       });

    legend.append("line")
      .attr("x1", -6)
      .attr("x2", 6)
      .attr("stroke", "#000");

    legend.append("text")
      .attr("x", 9)
      .attr("dy", "0.35em")
      .attr("fill", "#000")
      .style("font", "10px sans-serif")
      .text(function(d) { return d.key; });
  }

  //add total in original row array.
  function total(all) {
    all.forEach(function(a){ 
      a.total = 0;
      for ( var i = 0; i < scope.tablecolumnheader.length; i++){
        a.total += Number(a[scope.tablecolumnheader[i]]);
      }
    });
    return all;
  }


 scope.render = function() {
      TableService.readvalues2(scope.plot, projectId, refId, commitId)
       .then( function(value){
        scope.tablebody = value.tablebody;
        scope.tablecolumnheader = value.tableheader;
        scope.valuesO = value.tablebody.valuesO; //value objects used in watch
        if (scope.tablebody.c3_data.length === 0) { //no data
          return;
        }
        vf_pplot();
      }); //end of TableService
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



