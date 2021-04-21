import * as angular from "angular";
var mms = angular.module('mms');


mms.factory('TableService', ['$q', '$http', 'URLService', 'UtilsService', 'CacheService', '_', 'ElementService', TableService]);

function TableService($q, $http, URLService, UtilsService, CacheService, _, ElementService) {

  function readvalues2(plot, projectId, refId, commitId){ 

    var deferred = $q.defer();

    var aMmsEid = {projectId: projectId, refId: refId, commitId: commitId};
    var isHeader = (plot.table.header !== undefined && plot.table.header.length > 0 ? true : false);

    if (isHeader) {
      var aheader = asyncReadTableHeader(aMmsEid, plot.table.header[0]);
      aheader.then( function(tableheader){
        var abody = asyncReadTableBody2(aMmsEid, plot.table.body, tableheader);
        abody.then( function(tablebody){
          var r = {tableheader: tableheader, tablebody: tablebody, isHeader: isHeader};
          deferred.resolve(r);
        });
      });
    }
    else {
      var abody = asyncReadTableBody(aMmsEid, plot.table.body);
      abody.then( function(tablebody){
        var r = {tablebody: tablebody, isHeader:isHeader};
        deferred.resolve(r);
      });
    }
    return deferred.promise;
  } //end of readValues
  


  function readvalues(plot, projectId, refId, commitId){ 

    var deferred = $q.defer();

    var aMmsEid = {projectId: projectId, refId: refId, commitId: commitId};
    var isHeader = (plot.table.header !== undefined && plot.table.header.length > 0 ? true : false);

    if (isHeader) {
      var aheader = asyncReadTableHeader(aMmsEid, plot.table.header[0]);
      aheader.then( function(tableheader){
        var abody = asyncReadTableBody(aMmsEid, plot.table.body);
        abody.then( function(tablebody){
          var r = {tableheader: tableheader, tablebody: tablebody, isHeader: isHeader};
          deferred.resolve(r);
        });
      });
    }
    else {
      var abody = asyncReadTableBody(aMmsEid, plot.table.body);
      abody.then( function(tablebody){
        var r = {tablebody: tablebody, isHeader:isHeader};
        deferred.resolve(r);
      });
    }
    return deferred.promise;
  } //end of readValues
  



  function asyncReadTableHeader(aMmsEid, header){ 
    return $q( function(resolve){
      readRowValues(header, aMmsEid)
        .then(function(tableheader) {
        tableheader.values.shift(); //remove 1st element
        resolve(tableheader.values);
      });
    });
  } 

  function asyncReadTableBody(aMmsEid, tablebody) {
    return $q( function (resolve){
      var c3_data = [];
      var valuesO = [];
      
      tablebody.forEach(function(row){
        readRowValues(row, aMmsEid)
          .then(function (yyvalue){
            c3_data.push(yyvalue.values);
            valuesO.push(yyvalue.valuesO);
            if ( c3_data.length === tablebody.length) {
              var r = {
                c3_data: c3_data,
                valuesO: valuesO 
              };
              resolve(r);
            }
          });
      });
    });
  }

  function asyncReadTableBody2(aMmsEid, tablebody, tableheader) {
    return $q( function (resolve){

      var c3_data = [];
      var valuesO = [];

      //adding "rowheader" so length of header and rowvalues will be the same.
      var mtableheader = tableheader.slice(0);
      mtableheader.splice(0, 0, "rowheader");
      tablebody.forEach(function(row){
        readRowValues2(row, aMmsEid, mtableheader)
          .then(function (yyvalue){
            c3_data.push(yyvalue.valuesx);
            valuesO.push(yyvalue.valuesO);
            if ( valuesO.length === tablebody.length) {
              var r = {
                c3_data: c3_data,
                valuesO: valuesO 
              };
              resolve(r);
            }
          });
      });
    });
  }

  function getValue(datavalue){
    if (datavalue && datavalue.type === "LiteralString"){
      if ( isNaN(datavalue.value))
        return datavalue.value;
      else
        return Number(datavalue.value);
    }
    else if (datavalue && (datavalue.type === "LiteralReal" || datavalue.type === "LiteralInteger")){
      return datavalue.value;
    }
  } 
  function readParagraphValue(e,aMmsEid, index){

    return $q( function(resolve){
        if (e.content[0].sourceType == 'text'){
          //console.log("text");
          var tv = e.content[0].text.replace("<p>","").replace("</p>","").trim();
          if ( !isNaN(tv))
            tv = Number(tv);
          resolve( { index: index, value: tv, valueO: e});
        }
        else if (e.content[0].sourceType === 'reference'){
          aMmsEid.elementId =e.content[0].source;

          if ( e.content[0].sourceProperty === 'name'){
            //console.log("name");
            ElementService.getElement(aMmsEid, 1, false)
              .then(function(refe) {
                //value = refe.name;
                //valueO= refe;
                var nameModified = refe.name;
                if ( !isNaN(nameModified)) //means it is a number
                    nameModified = Number(nameModified);
                resolve( { index: index, value: nameModified, valueO: refe});
              });
          }
          else if ( e.content[0].sourceProperty === 'documentation'){
              //console.log("doc");
              ElementService.getElement(aMmsEid, 1, false)
                .then(function(refe) {
                  var docModified = refe.documentation.replace("<p>","").replace("</p>","").trim();
                  //seems adding \n at the end when modified at vieweditor so if number goahead to conver to number
                  //i.e., "5\n" will be a number.
                  if ( !isNaN(docModified)) //means it is a number
                    docModified = Number(docModified);
                  resolve( { index: index, value: docModified, valueO: refe});
                }); 
          }
          else { //sourceProperty === 'value'
              //console.log('value');
              ElementService.getElement(aMmsEid, 1, false)
              .then(function(refe) {

                var valueO= refe;
                var value = "";
                if (refe.type === 'Property' || refe.type === 'Port') {
                    if (refe.defaultValue) {
                        value = getValue(refe.defaultValue); //default value
                    } else {
                        value= "";
                    }
                }
                if (refe.type === 'Slot') {
                    value = getValue(refe.value[0]); //scope.element.value
                }
                /* not sure what to do
                if (refe.type === 'Constraint' && refe.specification) {
                    value = refe.specification;
                }
                if (refe.type === 'Expression') {
                    value = refe.operand;
                }
                */
                resolve( { index: index, value: value, valueO: valueO});
              });
            }//end of else
          } //reference
    });
  }
  function readRowValues ( row, aMmsEid ){

    return $q( function (resolve) {
      var values = [];
      var valuesO = [];
      var index = 0;
      row.forEach(function(e){
       if (e.content.length === 0){
          values[index] = null;
          valuesO[index] = null;
          index++;
       }
       else {
         if (e.content[0].type == 'Paragraph'){
            readParagraphValue(e, aMmsEid, index++)
            .then( function(r){
              values[r.index] =r.value;
              valuesO[r.index] = r.valueO;
              if ( values.length === row.length){
                var result = {
                    values: values,
                    valuesO: valuesO 
                };
                resolve(result);
              }
            });
          } // Paragraph
        } //end of else
      }); //for each row
    });
  } //end of function
  function readRowValues2 (row, aMmsEid, mtableheader){

    return $q( function (resolve) {
      var valuesx = []; //named index instead of number index
      var valuesO = [];
      var index = 0;
      row.forEach(function(e){
       if (e.content.length === 0){
          valuesx[mtableheader[index]] = null;
          valuesO[index] = null;
          index++;
       }
       else {
         if (e.content[0].type == 'Paragraph'){
            readParagraphValue(e, aMmsEid, index++)
            .then( function(r){
              valuesx[mtableheader[r.index]] = r.value;
              valuesO[r.index] = r.valueO;
              if ( valuesO.length === row.length){
                var result = {
                    valuesx: valuesx,
                    valuesO: valuesO 
                };
                resolve(result);
              }
            });
          } // Paragraph
        } //end of else
      }); //for each row
    });
  } //end of function
 //make only a-zA-Z0-9_ because id or class does not support special characters(ie., ())
    var toValidId = function(original) {
        return original.replace(/[^a-zA-Z0-9_]/gi, '');
    };

    /**
    * @param {Object} clientConfig The size width, height and margin info from magicDraw
    * @param {Object} defaultPlotConfig The size width, height and margin from the plot directive
    */
    var plotConfig = function(clientConfig, defaultPlotConfig){
      var plotConfig = defaultPlotConfig;
      if (clientConfig !== undefined){
        if (clientConfig.size !== undefined) {
          if( clientConfig.size.width != undefined && !isNaN(clientConfig.size.width))
              plotConfig.width = Number(clientConfig.size.width);
          if( clientConfig.size.height != undefined && !isNaN(clientConfig.size.height))
              plotConfig.height = Number(clientConfig.size.height);
        }
        if (clientConfig.padding !== undefined) {
          if (clientConfig.padding.top != undefined && !isNaN(clientConfig.padding.top))
            plotConfig.marginTop = Number(clientConfig.padding.top);
          if (clientConfig.padding.right != undefined && !isNaN(clientConfig.padding.right))
            plotConfig.marginRight = Number(clientConfig.padding.right);
          if (clientConfig.padding.left != undefined && !isNaN(clientConfig.padding.left))
            plotConfig.marginLeft = Number(clientConfig.padding.left);
          if (clientConfig.padding.bottom != undefined && !isNaN(clientConfig.padding.bottom))
            plotConfig.marginBottom = Number(clientConfig.padding.bottom);  
        }
      }
      return plotConfig;
    };

    return {
        toValidId : toValidId,
        plotConfig: plotConfig,
        readvalues: readvalues,  //for row values in number index
        readvalues2: readvalues2 //for row values with named(header) index
    };

}
