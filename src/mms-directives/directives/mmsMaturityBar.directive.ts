import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsMaturityBar', ['$window', mmsMaturityBar]);

/**
 * @ngdoc directive
 * @name mmsDirectives.directive:mmsMaturityBar
 *
 * @restrict E
 *
 * @description
 *
 * @param {string} state The current state of the maturity bar
 */
function mmsMaturityBar($window) {

    var mmsMaturityBarLink = function(scope, element, attrs) {
     	var d3 = $window.d3;  
      	
      	var svgContainer = d3.select(element[0]).append('svg')
		                                  .attr("width", 520)
		                                  .attr("height", 70);
		var colorRect;

		if(scope.state == "Identified") {
		  colorRect = ["brown","#B0B0B0","#B0B0B0","#B0B0B0","#B0B0B0"];
		} else if (scope.state == "Draft") {
		  colorRect = ["#FF7519","#FF7519","#B0B0B0","#B0B0B0","#B0B0B0"];
		} else if (scope.state == "Prelim") {
		  colorRect = ["#FFAA00","#FFAA00","#FFAA00","#B0B0B0","#B0B0B0"];
		} else if (scope.state == "Baseline") {
		  colorRect = ["#04859E","#04859E","#04859E","#04859E","#B0B0B0"];
		} else if (scope.state == "Final") {
		  colorRect = ["#00BD39","#00BD39","#00BD39","#00BD39","#00BD39"];
		} else {
		  colorRect = ["#B0B0B0","#B0B0B0","#B0B0B0","#B0B0B0","#B0B0B0"];			
		}

		svgContainer.append("rect")
		    .attr("x", 10)
		    .attr("y", 10)
		    .attr("width", 100)
		    .attr("height", 50)
		    .style("fill",colorRect[0])
		    .style("stroke","#fff")
		    .style("stroke-width",3);
		svgContainer.append("text")
		    .text("Identified")
		    .attr("x",60)
		    .attr("y",35)
		    .attr("dy", ".35em")
		    .attr("fill","#fff")
		    .attr("font-family","sans-serif")
		    .style("text-anchor", "middle");
		svgContainer.append("rect")
		    .attr("x", 110)
		    .attr("y", 10)
		    .attr("width", 100)
		    .attr("height", 50)
		    .style("fill",colorRect[1])
		    .style("stroke","#fff")
		    .style("stroke-width",3);
		svgContainer.append("text")
		    .text("Draft")
		    .attr("x",160)
		    .attr("y",35)
		    .attr("dy", ".35em")
		    .attr("fill","#fff")
		    .attr("font-family","sans-serif")
		    .style("text-anchor", "middle");
		svgContainer.append("rect")
		    .attr("x", 210)
		    .attr("y", 10)
		    .attr("width", 100)
		    .attr("height", 50)
		    .style("fill",colorRect[2])
		    .style("stroke","#fff")
		    .style("stroke-width",3);
		svgContainer.append("text")
		    .text("Prelim")
		    .attr("x",260)
		    .attr("y",35)
		    .attr("dy", ".35em")
		    .attr("fill","#fff")
		    .attr("font-family","sans-serif")
		    .style("text-anchor", "middle");
		svgContainer.append("rect")
		    .attr("x", 310)
		    .attr("y", 10)
		    .attr("width", 100)
		    .attr("height", 50)
		    .style("fill",colorRect[3])
		    .style("stroke","#fff")
		    .style("stroke-width",3);
		svgContainer.append("text")
		    .text("Baseline")
		    .attr("x",360)
		    .attr("y",35)
		    .attr("dy", ".35em")
		    .attr("fill","#fff")
		    .attr("font-family","sans-serif")
		    .style("text-anchor", "middle");
		svgContainer.append("rect")
		    .attr("x", 410)
		    .attr("y", 10)
		    .attr("width", 100)
		    .attr("height", 50)
		    .style("fill",colorRect[4])
		    .style("stroke","#fff")
		    .style("stroke-width",3);
		svgContainer.append("text")
		    .text("Final")
		    .attr("x",460)
		    .attr("y",35)
		    .attr("dy", ".35em")
		    .attr("fill","#fff")
		    .attr("font-family","sans-serif")
		    .style("text-anchor", "middle");
    };

    return {
        restrict: 'E',
        template: '',
        scope: {
            state: '@'
        },
        link: mmsMaturityBarLink
    };
}