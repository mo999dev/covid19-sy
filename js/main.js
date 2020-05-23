// all data stored here
var DATA = {};


var chart;
// global variables for data
var confirmed = {},
    recovered = {},
    deaths = {};

// convert csv to array
function CSVToArray(strData, strDelimiter) {
    // Check to see if the delimiter is defined. If not,
    // then default to comma.
    strDelimiter = (strDelimiter || ",");
    // Create a regular expression to parse the CSV values.
    var objPattern = new RegExp((
        // Delimiters.
        "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
        // Quoted fields.
        "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
        // Standard fields.
        "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");
    // Create an array to hold our data. Give the array
    // a default empty first row.
    var arrData = [
        []
    ];
    // Create an array to hold our individual pattern
    // matching groups.
    var arrMatches = null;
    // Keep looping over the regular expression matches
    // until we can no longer find a match.
    while (arrMatches = objPattern.exec(strData)) {
        // Get the delimiter that was found.
        var strMatchedDelimiter = arrMatches[1];
        // Check to see if the given delimiter has a length
        // (is not the start of string) and if it matches
        // field delimiter. If id does not, then we know
        // that this delimiter is a row delimiter.
        if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)) {
            // Since we have reached a new row of data,
            // add an empty row to our data array.
            arrData.push([]);
        }
        // Now that we have our delimiter out of the way,
        // let's check to see which kind of value we
        // captured (quoted or unquoted).
        if (arrMatches[2]) {
            // We found a quoted value. When we capture
            // this value, unescape any double quotes.
            var strMatchedValue = arrMatches[2].replace(
                new RegExp("\"\"", "g"), "\"");
        } else {
            // We found a non-quoted value.
            var strMatchedValue = arrMatches[3];
        }
        // Now that we have our value string, let's add
        // it to the data array.
        arrData[arrData.length - 1].push(strMatchedValue);
    }
    // Return the parsed data.
    return (arrData);
}
// convert csv to json string
function CSV2JSON(csv) {
    var array = CSVToArray(csv);
    var objArray = [];
    for (var i = 1; i < array.length; i++) {
        objArray[i - 1] = {};
        for (var k = 0; k < array[0].length && k < array[i].length; k++) {
            var key = array[0][k];
            objArray[i - 1][key] = array[i][k]
        }
    }

    var json = JSON.stringify(objArray);
    var str = json.replace(/},/g, "},\r\n");

    return str;
}

/**
 * format data to readable json object
 * DATA = {
 *     countryname: {
 *         total: number
 *         recovered: number
 *         deaths: number
 *         totalByDays: {
 *             '12/22/19': number
 *         } ....
 *     }
 * }
 */
function formatData(JSON_DATA, dataName) {
    for (var i = 0; i < JSON_DATA.length; i++) {

        delete JSON_DATA[i]['Province/State'];
        delete JSON_DATA[i]['Lat'];
        delete JSON_DATA[i]['Long'];

        var country = JSON_DATA[i]['Country/Region'];
        delete JSON_DATA[i]['Country/Region'];

        if (!DATA.hasOwnProperty(country)) {
            DATA[country] = {}; //DATA[country][dataName] = 0;
        }
        if (!DATA[country].hasOwnProperty(dataName)) {
            DATA[country][dataName] = 0;
        }
        if (!DATA[country].hasOwnProperty(dataName + 'ByDays')) {
            DATA[country][dataName + 'ByDays'] = {};
        }
        var Arr = Object.keys(JSON_DATA[i]);
        DATA[country][dataName] = Number(DATA[country][dataName]) + Number(JSON_DATA[i][Arr[Arr.length - 1]]);

        for (day in JSON_DATA[i]) {
            if (DATA[country][dataName + 'ByDays'].hasOwnProperty(day)) {
                DATA[country][dataName + 'ByDays'][day] += Number(JSON_DATA[i][day]);
            } else {
                DATA[country][dataName + 'ByDays'][day] = Number(JSON_DATA[i][day]);
            }

        }
    }
}

// add activeByDays property to DATA object
function getActiveByDays() {
    for (country in DATA) {
        DATA[country]['activeByDays'] = {};
        for (date in DATA[country]['totalByDays']) {
            DATA[country]['activeByDays'][date] = ((DATA[country]['totalByDays'][date] - DATA[country]['deathsByDays'][date]) - DATA[country]['recoveredByDays'][date]);
            //console.log(DATA[i][country]['activeByDays'][date]);
        }
        var dayDate = Object.keys(DATA[country]['totalByDays']),
            lastDay = dayDate[dayDate.length - 1]
        DATA[country]['active'] = ((DATA[country]['totalByDays'][lastDay] - DATA[country]['deathsByDays'][lastDay]) - DATA[country]['recoveredByDays'][lastDay]);
    }
}


// loop on each date to format it using formatDate function
function formatDATADate(dateArr) {

    var val = [];

    for (date in dateArr) {
        val.push(new Date(formatDate(date)).getTime());
    }

    return val;
}


// convert Date from 12/22/19 to 22/12/2019
function formatDate(date) {
    var day = '',
        month = '',
        year = '',
        tmp = [],
        str = '';
    tmp = date.split('/');
    day = tmp[1];
    month = tmp[0];
    year = '20' + tmp[2];
    str = year + '-' + month + '-' + day;
    return str;
}

// get the first day when confirmed started above zero
function getStartZoomDate(dateArr) {
    var start = 0;
    for (date in dateArr) {
        if (dateArr[date] > 0) {
            start = date;
            break;
        }
    }
    return new Date(formatDate(start)).getTime();
}

// get last-updated day
function getEndZoomDate(dateArr) {
    var end = formatDATADate(dateArr)
    return end[end.length - 1];
}

// load summary - chart - datatables
function loadData(countryName) {
    $("html, body").animate({ scrollTop: 0 }, 500);
    $("#summaryTotal").text(DATA[countryName].total);
    $("#summaryRecovered").text(DATA[countryName]['recovered'] + ' (' + Math.round(Number((Number(DATA[countryName]['recovered'].replace(/\,/gi , '')) * 100) / Number(DATA[countryName]['total'].replace(/\,/gi , '')))*100)/100 + '%)');
    $("#summaryActive").text(DATA[countryName]['active'] + ' (' + Math.round(Number((Number(DATA[countryName]['active'].replace(/\,/gi , '')) * 100) / Number(DATA[countryName]['total'].replace(/\,/gi , '')))*100)/100 + '%)');
    $("#summaryDeaths").text(DATA[countryName]['deaths'] + ' (' + Math.round(Number((Number(DATA[countryName]['deaths'].replace(/\,/gi , '')) * 100) / Number(DATA[countryName]['total'].replace(/\,/gi , '')))*100)/100 + '%)');
    $("#selectedCountryName").text(countryName);

    var options = {
        series: [{
            name: 'الإجمالي',
            data: Object.values(DATA[countryName].totalByDays)
        }, {
            name: 'الحالات النشطة',
            data: Object.values(DATA[countryName].activeByDays)
        }, {
            name: 'الوفيات',
            data: Object.values(DATA[countryName].deathsByDays)
        }, {
            name: 'حالات الشفاء',
            data: Object.values(DATA[countryName].recoveredByDays)
        }],
        chart: {
            height: 350,
            type: 'line'
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth'
        },
        xaxis: {
            type: 'datetime',
            categories: formatDATADate(DATA[countryName].totalByDays)
        },
        tooltip: {
            x: {
                format: 'dd/MM/yy HH:mm'
            },
            style: {
                fontFamily: "'Almarai', sans-serif"
            }
        },
        legend: {
            position: 'top'
        },
        colors: ['#4099ff', '#FFB64D', '#FF5370', '#2ed8b6'],
    };

    if (typeof chart === 'object') {
        chart.destroy();
    }

    chart = new ApexCharts(document.querySelector("#chart"), options);
    chart.render();
    chart.zoomX(getStartZoomDate(DATA[countryName].totalByDays), getEndZoomDate(DATA[countryName].totalByDays));

    if (!$.fn.dataTable.isDataTable('#countries')) {
        for (country in DATA) {
            $("#countriesData").append('<tr><td onClick="loadData(\'' + country + '\')">' + country + '</td><td>' + DATA[country]['total'] + '</td><td>' + DATA[country]['recovered'] + '</td><td>' + DATA[country]['deaths'] + '</td><td>' + DATA[country]['active'] + '</td></tr>');
        }
        var worldTotal = 0,
            worldRecovered = 0,
            worldActive = 0,
            worldDeaths = 0;
        for (country in DATA) {
            worldTotal += Number(DATA[country]['total'].replace(/,/gi, ''));
            worldRecovered += Number(DATA[country]['recovered'].replace(/,/gi, ''));
            worldActive += Number(DATA[country]['active'].replace(/,/gi, ''));
            worldDeaths += Number(DATA[country]['deaths'].replace(/,/gi, ''));
        }
        $("#countriesData").append('<tr><td>World</td><td>' + worldTotal.toLocaleString() + '</td><td>' + worldRecovered.toLocaleString() + '</td><td>' + worldDeaths.toLocaleString() + '</td><td>' + worldActive.toLocaleString() + '</td></tr>');
        $('#countries').DataTable({
            pagingType: 'simple'
        });
    }

}


function commafy() {
    for (country in DATA) {
        DATA[country].total = DATA[country].total.toLocaleString();
        DATA[country].recovered = DATA[country].recovered.toLocaleString();
        DATA[country].deaths = DATA[country].deaths.toLocaleString();
        DATA[country].active = DATA[country].active.toLocaleString();
    }
}

// init all required data and store it in DATA object
function init() {

    formatData(confirmed, 'total');
    formatData(recovered, 'recovered');
    formatData(deaths, 'deaths');
    getActiveByDays();
    commafy();

    if (DATA.hasOwnProperty('undefined')) {
        delete DATA['undefined'];
    }
    DATA.Palestine = DATA.Israel;
    $(".loader").hide();

}


// fetch data and start
$(document).ready(function() {

    var done = true;

    $.ajax({
        url: "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv",
        type: "GET",
        async: false,
        cache: false,
        complete: function() {

        },
        success: function(res) {
            confirmed = JSON.parse(CSV2JSON(res));
        },
        error: function() {
            done = false;
        }
    });

    $.ajax({
        url: "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv",
        type: "GET",
        async: false,
        cache: false,
        complete: function() {

        },
        success: function(res) {
            recovered = JSON.parse(CSV2JSON(res));
        },
        error: function() {
            done = false;
        }
    });

    $.ajax({
        url: "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv",
        type: "GET",
        async: false,
        cache: false,
        complete: function() {
        },
        success: function(res) {
            deaths = JSON.parse(CSV2JSON(res));
        },
        error: function() {
            done = false;
        }
    });

    if (done && typeof ApexCharts !== undefined && typeof $().DataTable !== undefined) {
        init();
        loadData('Syria');    
    } else {
        $('.loader .spinner').removeClass('spinner fa-spin').addClass('text-danger').text('Network error, Please refresh the page');
    }


});
