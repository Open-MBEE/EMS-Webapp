
import * as jQuery from 'jquery';

jQuery.fn.table2CSV = function(inputOptions) {
    var options = jQuery.extend({
        separator: ',',
        header: [],
        delivery: 'popup' // popup, value
    },
    inputOptions);

    var csvData = [];
    var el = this;
    
    function handleMatrix(bodyTag, cellTag) {
        var spanData = {}; //if spanData[curRow][curCol] is true that means that 'cell' should be "" due to merged cell
        var curRow = 0;
        $(el).children(bodyTag).children('tr').each(function() {
            tmpRow = [];
            var curCol = 0;
            $(this).children(cellTag).each(function() {
                while(spanData[curRow] && spanData[curRow][curCol]) {
                    tmpRow.push('""');
                    curCol++;
                }
                tmpRow.push(formatData($(this).text()));
                var rowstring = $(this).attr('rowspan');
                if (rowspan) {
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
                if (!colstring){
                    curCol++;
                    return;
                }
                var colspan = parseInt(colstring);
                while (colspan > 1) {
                    curCol++;
                    tmpRow.push('""');
                    colspan--;
                    if (rowspan > 1) {
                        for (var i = 1; i < rowspan; i++) {
                            spanData[curRow + i][curCol] = true;
                        }
                    }
                }
                curCol++;
            });
            row2CSV(tmpRow);
            curRow++;
        });
    }

    //header
    var numCols = options.header.length;
    var tmpRow = []; 
    if (numCols > 0) {
        for (var i = 0; i < numCols; i++) {
            tmpRow[tmpRow.length] = formatData(options.header[i]);
        }
    } else {
        handleMatrix('thead', 'th');
    }
    // actual data
    handleMatrix('tbody', 'td');
    var mydata = csvData.join('\n');
    if (options.delivery == 'popup') {
        return popup(mydata);
    } else {
        return mydata;
    }

    function row2CSV(tmpRow) {
        var tmp = tmpRow.join(''); // to remove any blank rows
        if (tmpRow.length > 0 && tmp != '') {
            var mystr = tmpRow.join(options.separator);
            csvData[csvData.length] = mystr;
        }
    }
    function formatData(input) {
        // replace " with “
        var regexp = new RegExp(/["]/g);
        var output = input.replace(regexp, "“");
        //HTML
        // var regexp = new RegExp(/\<[^\<]+\>/g);
        // var output = output.replace(regexp, "");
        var i = output.search(/\S/); //index of first non whitespace char
        if (i > 0) {
            output = '_'.repeat(i) + $.trim(output);
        }
        output = $.trim(output);
        if (output == "") return '';
        if (output[0] == '+' || output[0] == '=' || output[0] == '-') {
            output = ' ' + output;
        }
        return '"' + output + '"';
    }
    function popup(data) {
        var generator = window.open('', 'csv', 'height=400,width=600');
        generator.document.write('<html><head><title>CSV</title>');
        generator.document.write('</head><body >');
        generator.document.write('<textArea cols=70 rows=15 wrap="off" >');
        generator.document.write(data);
        generator.document.write('</textArea>');
        generator.document.write('</body></html>');
        generator.document.close();
        return true;
    }
};