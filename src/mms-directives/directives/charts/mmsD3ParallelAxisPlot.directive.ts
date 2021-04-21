import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsD3ParallelAxisPlot', ['TableService', '$window', mmsD3ParallelAxisPlot]);
function mmsD3ParallelAxisPlot(TableService,  $window) {
      
  var mmsChartLink = function(scope, element, attrs, mmsViewCtrl) {
   
    scope.rowHeaders=[]; //not null when render is called 1st time.      
    var d3 = $window.d3;  
    var divchart = d3.select(element[0]).append('div');  
    
    var defaultPlotConfig = {width : 900, 
        marginTop:0, marginRight:0, marginBottom:25, marginLeft:60};
      

    var projectId;
    var refId;
    var commitId;
          
    if (mmsViewCtrl) {
      var viewVersion = mmsViewCtrl.getElementOrigin();
      projectId = viewVersion.projectId;
      refId = viewVersion.refId;
      commitId = viewVersion.commitId;
    }
    
    function vf_pplot(_out) {

      var plotConfig = TableService.plotConfig(scope.plot.config.options, defaultPlotConfig);

      var outputs = _out;
      var width =plotConfig.width;
      var height = plotConfig.width*0.37;
      var m = [plotConfig.marginTop, plotConfig.marginRight, plotConfig.marginBottom, plotConfig.marginLeft]; //top, right, bottom, left
      
      var maxSize = 0;
      var size = 0;
            
      //redefine top and right margin based on TB string length
      maxSize = 0;
      size = 0;
      for (var i = 0; i < outputs.variables.length; i++)
      {
        size = outputs.variables[i].length; //length of the string
        if (maxSize < size)
          maxSize = size;
      }
      
      m[0] = maxSize * 4.5 * 0.707 + 50; //to make label
      m[1] = maxSize * 4.5 * 0.707 + 10;
      
      //define width and height
      var w = width - m[1] - m[3],
        h = height - m[0] - m[2];

      var colorscale = d3.scaleOrdinal(d3.schemeCategory10);
      var x = d3.scalePoint(d3.schemeCategory10).domain(outputs.variables).range([0, w]),
      y = {};
      var line = d3.line(),foreground;

      divchart.selectAll('*').remove();
      var svg = divchart
        .append("svg:svg")
        .attr("class", "papchart" + scope.$id + " papchart")
        .attr("style", 'border:1px solid #ddd')
        .attr("width", w + m[1] + m[3])
        .attr("height", h + m[0] + m[2])
        .append("svg:g")
        .attr("transform", "translate(" + m[3] + "," + m[0] + ")");
        
      //Need to create a temporary object with the data, objectives, and threshold values
      //to scale the axes properly
      var minMax = {};

      outputs.variables.forEach(function(d, i){
        minMax[d] = {};
        
        //initialize minTest and maxTest variables
        var minTest = outputs.table[0].values[d];
        var maxTest = outputs.table[0].values[d];

        for (var j = 0; j < outputs.table.length; j++)
        {
          //test to see if minTest is still the minimum
          if (minTest > outputs.table[j].values[d])
            minTest = outputs.table[j].values[d];
          
          //tests to see if maxTest is still the maximum
          if (maxTest < outputs.table[j].values[d])
            maxTest = outputs.table[j].values[d];
        }
        minMax[d].min = minTest;
        minMax[d].max = maxTest;
      });
      
      var range = {};
      var minimum = {};
      var maximum = {};

      var percentScaling = 0.07;
      
      //make each minMax a bit bigger or smaller to better plot the data set
      outputs.variables.forEach(function(d, i){
        range[d] = Math.abs(minMax[d].max - minMax[d].min);
      
        minimum[d] = minMax[d].min - range[d] * percentScaling;
        maximum[d] = minMax[d].max + range[d] * percentScaling;
        
        //what if both the min and the max were equal?  Give it some "range" about the point
        if (minMax[d].max == minMax[d].min)
        {
          maximum[d] = minMax[d].max * (percentScaling + 1);
          minimum[d] = minMax[d].max * (1 - percentScaling);
        }
        
        //what if the only value for a variable is zero? Give it some "range" about zero
        if (minMax[d].max === 0 && minMax[d].min === 0)
        {
          maximum[d] = percentScaling;
          minimum[d] = -percentScaling;
        }
      });
      

      //Create a scale and brush for each variables.
      outputs.variables.forEach(function (d) {
        y[d] = d3.scaleLinear()
          .domain([minimum[d], maximum[d]])
          .range([h, 0]);
        
      });
      
      var tooltip = svg.append('text')
       .style('opacity', 0)
       .style('font-family', 'sans-serif')
       .style('font-size', '13px');

      
      var axisData = [];
      var tickData = [];
      outputs.table.forEach(function(d){
        if ( d.tickColor === undefined)
          axisData.push(d);
        else
          tickData.push(d);
      });
      // Add foreground lines. background brush
      foreground = svg.append("svg:g")
      .attr("class", "foreground")
      .selectAll("path")
      .data(axisData)
      .enter().append("svg:path")
      .attr("d", path)
      .on("mouseover", function(d) {
          tooltip
          .attr('x', d3.mouse(this)[0])
          .attr('y', d3.mouse(this)[1])
          .text(d.row)
          .transition(200)
          .style('opacity', 1);
      })
      .on("mouseout", function() {
        //remove the text element added on the mouseover event when the mouseout event is triggered
         tooltip
        .transition(200)
        .style('opacity', 0);
      })
      .attr("stroke", function(d, i){ return colorscale(i);})
      .attr("fill", "none")
      .style("stroke-width", "1px")
      .attr("cid", function(d,i){
        return d.cid;
      })
      .attr("config", function(d,i){
        return d.design;
      })
         //.attr("title", "TEST")
      .attr("class", function (d,i) {
          var string = "design " + d.cid + " selected";
            return string;
      })
      //add title to the path.  mouseover shows it in bubble looking
      .append("svg:title")
      .text(function(d){return d.row;});

      // Add a group element for each variables.
      var g = svg.selectAll(".variables")
        .data(outputs.variables)
        .enter().append("svg:g")
        .attr("class", "variables")
        .attr("transform", function(d,i) { 
            return "translate(" + x(d) + ")"; 
          });

      // Add an axis and title.
      g.append("svg:g")
        .attr("class", "axis")
        .each(function(d) { 
          //d3.select(this).call(axis.scale(y[d])); 
          d3.select(this).call(d3.axisLeft(y[d]).ticks(5));
        })
      .append("svg:text")
        .data(outputs.variables)
        .attr("y", -12)
        .attr("transform", "rotate(-45 0 0)") //deg y x
        .attr("x", 0)
        .attr("class", "axislabel")
        .attr("fill", "black")
        .text(function(d){
          return d;
        });

        var axisTick;                
        tickData.forEach(function(td){
          //Adding axisTick
          g.select("g.axis").append("g")
          .attr("transform", function (d) {
              return "translate(0," + y[d](td.values[d]) + ")";
          })
          .attr("class", "objectivetick")
          .append("line")
          .attr("stroke", td.tickColor)
          .style("stroke-width", "3px")
          .attr("fill", "none")
          .attr("x1", -5)
          .attr("x2", 6)
          .attr("y2", 0)
          .on("mouseover", function(d) {
            tooltip
            .attr('x', d3.mouse(this)[0] + x(d))
            .attr('y', d3.mouse(this)[1] + y[d](td.values[d]))
            .text(td.row)
            .transition(200)
            .style('opacity', 1);
          })
          .on("mouseout", function(d) {
            //remove the text element added on the mouseover event when the mouseout event is triggered
             tooltip
            .transition(200)
            .style('opacity', 0);
          });
      });
      // Returns the path for a given data point.
      function path(d) {
        d = d.values;
        return line(outputs.variables.map(function (p) {
            return [x(p), y[p](d[p])];
          }));
      }
    }//end of vf_pplot()

    function getTickColor(rowHeaderName){
      if (scope.plot.config.ticks !== undefined){
        for ( var kk = 0; kk < scope.plot.config.ticks.length; kk++){
            if( scope.plot.config.ticks[kk].name === rowHeaderName )
                return scope.plot.config.ticks[kk].color; 
         }
      }
      return undefined;
    }

    scope.render = function() {

      TableService.readvalues(scope.plot, projectId, refId, commitId)
       .then( function(value){
        scope.tablebody = value.tablebody;
        scope.tableheader = value.tableheader;
        scope.isHeader = value.isHeader;
        scope.valuesO = value.tablebody.valuesO; //value objects used in watch
        if (scope.tablebody.c3_data.length === 0) { //no data
          return;
        }
        var  dataseries= [];
        var tickColor;
        scope.tablebody.c3_data.forEach( function (row){
            var values = [];
            for (var i = 1; i < row.length; i++) {
              values[scope.tableheader[i-1]] = row[i];
              tickColor = getTickColor(row[0]);
            }
            dataseries.push( {row: row[0], tickColor: tickColor, values: values});
        });
        var modelData = {
           variables: scope.tableheader,
           table: dataseries //columnHeader and values
        };
        vf_pplot(modelData);
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



