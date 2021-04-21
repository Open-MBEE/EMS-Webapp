import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');
//d3js grouped horizontal bar chart is created by referencing
//http://bl.ocks.org/erikvullings/51cc5332439939f1f292

mmsDirectives.directive('mmsD3GroupedHorizontalBarPlot', ['TableService','$window', mmsD3GroupedHorizontalBarPlot]);
function mmsD3GroupedHorizontalBarPlot(TableService, $window) {

    var mmsChartLink = function(scope, element, attrs, mmsViewCtrl) {

      var d3 = $window.d3;  
      var divchart = d3.select(element[0]).append('div');
      var defaultPlotConfig = {width : 960,
        marginTop:20, marginRight:40, marginBottom:30, marginLeft:40};
     var plotConfig = TableService.plotConfig(scope.plot.config.options, defaultPlotConfig); 
      var achartdata;
      element.click(function(e) {
        //stop Propogating event to parent(mms-transclude-doc) element.
        e.stopPropagation();
      });

      var d3colorR = d3.scaleOrdinal(d3.schemeCategory10).range();
      function getColor(data, i){
        return data.colors !== undefined ? d3colorR[data.colors[i]] : d3colorR[i];
      }
      var projectId;
      var refId;
      var commitId;

      if (mmsViewCtrl) {
        var viewVersion = mmsViewCtrl.getElementOrigin();
        projectId = viewVersion.projectId;
        refId = viewVersion.refId;
        commitId = viewVersion.commitId;
      }
      var opacitydefault = 1,//0.7,
          opacityselected = 1.0,
          opacitynotselected = 0.3;

      function mouseout(){
        d3.selectAll(".ghbbar")
          .transition(200)
          .style("fill-opacity", opacitydefault); 

        d3.selectAll(".legendRect")
          .transition(200)
          .style("fill-opacity", opacitydefault); 

        d3.selectAll(".legentFilter")
          .transition(200)
          .style("opacity", opacitydefault);
      }//end of function mouseout

      function mouseover(mouseoverClassId){
            d3.selectAll(".ghbbar")
            .transition(200)
            .style("fill-opacity", opacitynotselected); 

             d3.selectAll(".legendRect")
            .transition(200)
            .style("fill-opacity", opacitynotselected); 

            d3.selectAll(".legentFilter")
            .transition(200)
            .style("opacity", opacitynotselected);
            
            d3.selectAll(mouseoverClassId)
            .transition(200)
            .style("fill-opacity", opacityselected);
           
            d3.selectAll(mouseoverClassId)
            .transition(200)
            .style("opacity", opacityselected);
      } //end of function mouseover

      function createFilters(data){
            //create only one filter display
            var graphFilter = divchart.append('div')
              .attr("class", 'graphFilter '+ data.id)
              .style('margin-left', plotConfig.marginLeft + 'px');
            var filterLegendsDiv = graphFilter.append('div')
              .append('label').style('border', '1px solid #ddd')
              .text ("Filter by Legends");
              filterLegendsDiv
                .selectAll("div")
                .data(data.legends)
                .enter()  
                .append("div")
                .attr("class", function(d,i){return "legentFilter "+ data.id + " " + TableService.toValidId(d);} )
                .attr("style", function(d,i){return "opacity: " + opacitydefault + ";background-color:" + getColor(data,i) + ";";})
                .on('mouseover', function (d, i) {
                    mouseover("."+data.id +"." + TableService.toValidId(d));
                })
                .on('mouseout', function (d, i) {
                    mouseout();
                })
                .append("label")
                .each(function (d, i) {
                      // create checkbox for each data
                      d3.select(this).append("input")
                        .attr("type", "checkbox")
                        .attr("checked",function(d,i){
                          if (data.legendsFilter[TableService.toValidId(d)] === true)
                            return true;
                          else 
                            return null;
                        })
                        .attr("style", function(d,i){var color = getColor(data,i); return "color: " +color + ";background-color:" + color + ";";})
                        .on("click", function (d) {
                            // filter by legends
                            data.legendsFilter[TableService.toValidId(d)] = this.checked;
                            createGroupedHorizontalBarChart(achartdata); 
                            createFilters(achartdata);
                         });
                      d3.select(this).append("span")
                          .text(function (d) {
                              return d;
                          });
              });
              var filterColoumnsDiv = graphFilter.append('div')
                .append('label').style('border', '1px solid #ddd')
                .text ("Filter by Columns");
              filterColoumnsDiv
                .selectAll("div")
                .data(data.labels)
                .enter()  
                .append("div")
                .attr("class", function(d,i){return "columnfilter "+ data.id + " " + TableService.toValidId(d);} )
                .on('mouseover', function (d, i){
                      mouseover('.'+data.id+'.' + TableService.toValidId(d));
                })
                .on('mouseout', function (d, i){
                      mouseout();
                })
                .append("label")
                .each(function (d, i) {
                    // create checkbox for each data
                    d3.select(this).append("input")
                      .attr("type", "checkbox")
                      .attr("checked", function(d,i){
                          if (data.labelsFilter[TableService.toValidId(d)] === true)
                            return true;
                          else 
                            return null;
                      })
                      .on("click", function (d) {
                          //filter by columns(labels)
                          data.labelsFilter[TableService.toValidId(d)] = this.checked;     
                          createGroupedHorizontalBarChart(achartdata); //2nd argument is not used
                          createFilters(achartdata);
                       });
                    d3.select(this).append("span")
                        .text(function (d) {
                            return d;
                    });
              });
      } //end of function createFilter

      function createGroupedHorizontalBarChart(data)
      {
        divchart.selectAll('*').remove();
        divchart.attr("class", achartdata.id )
          .attr("style", 'border:1px solid #ddd');
         
        var svg = divchart.append("svg:svg")
          .attr("class", "ghbchart " + data.id);
      
        var filteredDataValues = [];
        var filteredDataSysmlids=[];
        var filteredDataColors=[];
        var filteredDataLegends=[];//table row headers
        var filteredDataLabels=[];//table column headers
        var datalegendsfilter = data.legendsFilter;
        var datalabelsfilter = data.labelsFilter;            
        var counter = -1;

        for (var i=0; i<data.labels.length; i++) {
          if ( datalabelsfilter[TableService.toValidId(data.labels[i])]){
            filteredDataLabels.push(data.labels[i]);
            for (var j=0; j<data.values.length; j++) { //data.values.length == data.legends.length
              counter++;
              if (datalegendsfilter[TableService.toValidId(data.legends[j])]){
                filteredDataValues.push(Number(data.values[j][i]));
                filteredDataSysmlids.push(data.valueIds[j][i]);
                filteredDataColors.push(getColor(data ,counter % data.legends.length));
                filteredDataLegends.push(TableService.toValidId(data.legends[j]));
              }
            }
          }
        }
        var filteredLegendsLength = filteredDataLegends.length/filteredDataLabels.length;
        
        var chartWidth       = plotConfig.width-260,
            barHeight        = 20,
            groupHeight      = barHeight * filteredLegendsLength,
            gapBetweenGroups = 10,
            spaceForLabels   = plotConfig.marginLeft,
            spaceForLegend   = 200,
            marginbottom = 50;
        var chartHeight = barHeight * filteredDataValues.length + gapBetweenGroups * filteredDataLabels.length;

        var x = d3.scaleLinear()//d3.scale.linear()
            .domain([0, d3.max(filteredDataValues)])
            .range([0, chartWidth]);

        var y = d3.scaleLinear()//d3.scale.linear()
            .range([chartHeight + gapBetweenGroups, 0]);

        var yAxis = d3.axisLeft(y)//d3.svg.axis()
            .tickFormat('')
            .tickSize(0);
                        
        // Specify the chart area and dimensions
        var chart = svg
            .attr("width", plotConfig.width)
            .attr("height", chartHeight + marginbottom);
        
        // Create bars
        var bar = chart.selectAll("g")
            .data(filteredDataValues)
            .enter().append("g")
            .attr("transform", function(d, i) {
              return "translate(" + spaceForLabels + "," + (i * barHeight + gapBetweenGroups * (0.5 + Math.floor(i/filteredLegendsLength))) + ")";
            });
        var numRows = filteredDataLegends.length/filteredDataLabels.length;
        // Create rectangles of the correct width
        bar.append("rect")
            .attr('id', function(d,i){ return filteredDataSysmlids[i];})
            .attr("fill", function(d,i) { return filteredDataColors[i]; })
            .style("fill-opacity", opacitydefault)
            .attr("class", function(d,i){ 
              return "ghbbar "+ data.id + " " + filteredDataLegends[i] + " " + TableService.toValidId(filteredDataLabels[Math.floor(i/numRows)]);
              })
            .attr("width", x)
            .attr("height", barHeight - 1)
            .on('click', function(d, i) {
              if (mmsViewCtrl)
                  mmsViewCtrl.transcludeClicked(this.id); 
            })
            .on('mouseover', function (d, i){
               mouseover("."+ data.id+"." + filteredDataLegends[i]);
            })
            .on('mouseout', function (d, i){
              mouseout();
            });
        // Add text label in bar
        bar.append("text")
            .attr("class", function(d,i){ return "ghbbar "+data.id + " " + filteredDataLegends[i];})
            .attr("x", function(d) { return x(d) - 3; })
            .attr("y", barHeight / 2)
            .attr("dy", ".35em")
            .text(function(d) { return d; });

        //left side label      
        bar.each(function(d, i){
            if (i % filteredLegendsLength === 0){
               d3.select(this).append("text")
              .attr("class", "label")
              .attr("x", function(d) { return - 10; })
              .attr("y", groupHeight / 2)
              .attr("dy", ".35em")
              .text(filteredDataLabels[Math.floor(i/filteredLegendsLength)]);
            }
        });
        chart.append("g")
              .attr("class", "y axis")
              .attr("id", "ghbaxis")
              .attr("transform", "translate(" + spaceForLabels + ", " + -gapBetweenGroups/2 + ")")
              .call(yAxis);

        // Draw legend
        var legendRectSize = 18,
            legendSpacing  = 4;
        var mouseoverId;
        var legend = chart.selectAll('.legend')
            .data(data.legends)
            .enter()
            .append('g')
            .attr('transform', function (d, i) {
                var height = legendRectSize + legendSpacing;
                var offset = -gapBetweenGroups/2;
                var horz = spaceForLabels + chartWidth + 60 + legendRectSize;
                var vert = i * height - offset;
                return 'translate(' + horz + ',' + vert + ')';
            })
            .on('mouseover', function (d, i){
               mouseover("."+ data.id+"."+ TableService.toValidId(d));
            })
            .on('mouseout', function (d, i){
              mouseout();
            });

        legend.append('rect')
            .attr('class', function(d,i){ return 'legendRect ' + data.id+ " " + TableService.toValidId(d);})
            .attr('width', legendRectSize)
            .attr('height', legendRectSize)
            .style("fill-opacity", opacitydefault)
            .style('fill', function (d, i) { return getColor(data,i); /*return color(i);*/ })
            .style('stroke', function (d, i) {return getColor(data,i); /*return color(i);*/ });

        legend.append('text')
            .attr('class', 'legend')
            .attr('x', legendRectSize + legendSpacing)
            .attr('y', legendRectSize - legendSpacing)
            .text(function (d, i) {return d; });
      }
      scope.render = function() {
        TableService.readvalues(scope.plot, projectId, refId, commitId)
       .then( function(value){
        var tablebody = value.tablebody;
        var tableheader = value.tableheader;
        //scope.isHeader = value.isHeader;
        scope.valuesO = value.tablebody.valuesO; //value objects used in watch
        if (tablebody.c3_data.length === 0) { //no data
          return;
        }
        var udcolors;
        if (scope.plot.config.colors !== undefined){
          udcolors = scope.plot.config.colors;
        }
        var rowvalues = [];
        var cellIds = []; //0, 1, 2, 3
        var legends = [];
        var legendsFilter = [];
        var rowvalue;
        var cellId;
        var cid = 0;
        tablebody.c3_data.forEach( function (row){
           legends.push(row[0]);
           legendsFilter[row[0]] = true;
           rowvalue = []; //reset
           cellId = []; //reset
           for ( var i = 1; i < row.length; i++){
            rowvalue.push(row[i]);
            cellId.push(cid++);
           }
           cellIds.push(cellId);
           rowvalues.push(rowvalue);
        });
        var labelsFilter = []; 
        tableheader.forEach( function (item){
          labelsFilter[item] = true;
        });
        achartdata = {
            id: '_'+scope.$id,
            labels: tableheader,
            legends: legends, //row headers
            colors: udcolors,
            values: rowvalues,//table body without row headers
            valueIds: cellIds,
            legendsFilter: legendsFilter,
            labelsFilter: labelsFilter
           };
          createGroupedHorizontalBarChart(achartdata);
          createFilters(achartdata);
          });
      }; //end of render
      scope.$watch('valuesO', function(newValue, oldValue) {
        return scope.render();
      },true); 

      //rect bar is clicked or table cell (Except rowHeaders) is clicked
      scope.$on('elementSelected', function(event, eid, type) {
          d3.selectAll("rect").transition(200).style("fill-opacity", opacitynotselected);
      });
     
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
