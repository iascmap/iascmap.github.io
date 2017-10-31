// CAN WE EXTRACT FROM DATASET? NEED TITLE AND CODE! THEN IF ADD NEW ONE WILL BE AUTO PICKED UP! 

	// DROPDOWNS
	///////////////////////////////////////////////////////////////

	// Set initial dataset (changed on update)
	var currentGroup = "area";		// initial group (eg Area)
	var current = "Total";			// initial dataset within Group (eg Regional)

	// Datasets <id/index> : <title to display>
	var datasetsArea = {"Total" : "Area covered...", "Regional" : "Regional partnerships", "Subregional" : "Subregional partnerships" , "Local" : "Local partnerships"};

	var datasetsChaired = {"Total" : "Chaired by...",
		"CPS" : "Crown Prosecution Service",
		"GOVERNMENT" : "Government",
		"HEALTH" : "Health",
		"INDEPENDENT" : "Independent",
		"LA (2T)" : "Local Authority (district)",
		"LA (TT)" : "Local Authority (top tier)",
		"LGA" : "Local Government Association",
		"NGO" : "Non Government Oganisation",
		"OPCC" : "Police & Crime Comissioner",
		"POLICE" : "Police",
		"POLICE / NGO" : "Police / NGO",
		"ROTATES" : "Rotates",
		"TBD" : "To be determined"};

	var datasetsCoordinated = {"Total" : "Coordinated by...", 
		"CPS" : "Crown Prosecution Service",
		"GOVERNMENT" : "Government",
		"HEALTH" : "Health",
		"INDEPENDENT" : "Independent",
		"LA (2T)" : "Local Authority (district)",
		"LA (TT)" : "Local Authority (top tier)",
		"LGA" : "Local Government Association",
		"NGO" : "Non Government Oganisation",
		"OPCC" : "OPCC",
		"POLICE" : "Police",
		"TBD" : "To be determined"};

	var datasetsActivities = {"Total" : "Activities include...",
	 "Co-ordinating referrals" : "Co-ordinating referrals", 
	 "Community awareness-raising" : "Community awareness-raising", 
	 "Frontline staff training" : "Frontline staff training" , 
	 "Intelligence sharing" : "Intelligence sharing",
	 "Joint commissioning of services" : "Joint commissioning of services",
	 "Monitoring and analysis of progress" : "Monitoring and analysis of progress",
	 "Other" : "Other",
	 "Planning for joint enforcement" : "Planning for joint enforcement",
	 "Supply chains analysis" : "Supply chains analysis",
	 "Survivor support" : "Survivor support"};

	// Create dropdowns
	var dropdowns = ["area", "chaired", "coordinated", "activities"]; // all dropdowns; used for reset on update
	createDropdown("area", datasetsArea);			// id for the select; array of datasets for the dropdown
	createDropdown("chaired", datasetsChaired);
	createDropdown("coordinated", datasetsCoordinated);
	createDropdown("activities", datasetsActivities);
	// Create reset button
	var reset = document.createElement("button");
// TODO add JS action to reset & not submit form...
	reset.className = 'reset';
	reset.addEventListener('click', function() {
		window.location.href = "index.html";  	// TEMP just reload the page
	/*    document.getElementById('dropdowns').reset();
	    current = "Total";						// reset back to all partnerships
	    updateTitle();
	    updateMap();
	    updateTable();
	*/
		//alert('reset done!');
		return false;							// Hmmm doesnt stop form submission?
	}, false);	
	reset.appendChild(document.createTextNode('Reset'));
	document.getElementById("titleContainer").appendChild(reset);


	// MAP
	///////////////////////////////////////////////////////////////

	// Setup tooltip div
	var div = d3.select("body").append("div")   
		.attr("class", "tooltip")               
		.style("opacity", 0);

	// Setup map
	var width = 450,
	    height = 740;

	var projection = d3.geoAlbers()
		.center([1.5, 54.4])
		.rotate([4.4, 0])
    	.parallels([50, 60])
	    .scale(4200)
	    .translate([width / 2, height / 2]);

	var path = d3.geoPath()
	    .projection(projection);

	var svg = d3.select("#map")
	   	.append("div")
   		.classed("svg-container", true) 				//container class to make it responsive
   		.append("svg")
		.attr("id", "svg")
   		.attr("preserveAspectRatio", "xMinYMin meet")	//responsive SVG needs these 2 attributes and no width and height attr
   		.attr("viewBox", "0 0 450 740") 				//min-x, min-y, width and height
   		.classed("svg-content-responsive", true);    	//class to make it responsive
	    //.attr("width", width)
	    //.attr("height", height);


	// Setup colour scale; Threshold so can set own break points (input domain)
	var color = d3.scaleThreshold()
    	.domain([1, 2, 4, 6, 10]) 	// stretch the bottom of the scale
    	//.range(['#eff3ff','#bdd7e7','#6baed6','#3182bd','#08519c']); // 5 blues from colorbrewer2.org
    	.range(['#f2f2f2','#bdd7e7','#6baed6','#3182bd','#08519c']); // grey 1st one + 5 blues from colorbrewer2.org
    	//.range(['#cccccc','#bdd7e7','#6baed6','#3182bd','#08519c']); // DARKER grey 1st one + 5 blues from colorbrewer2.org



	// LOAD DATA
	///////////////////////////////////////////////////////////////

	// Ideally data file contains ALL ids present in geojson (so colour lookup returns zero not undefined)
	// Plus want pretty titles for hover
	d3.queue()
    	.defer(d3.json, "policeforceareas_uk_4326.json") 		// Load shapes
    	//.defer(d3.csv, "police.3.test.csv") 	 			// TEST !
    	.defer(d3.csv, "police.3.csv") 						// Load statistics/data
    	.defer(d3.csv, "policeforceareas.csv") 					// Load PFA display names
    	.await(ready); 											// Run 'ready' when JSONs are loaded


	// Ready Function, runs when data is loaded
	function ready(error, uk, data, displayname) 
	{
		if (error) throw error;

      	// READ DATA FROM CSV -> map to array per PFA ID
		///////////////////////////////////////////////////////////////

    	// Setup map of displayname per PFA
    	displaynameById = d3.map(displayname, function(d) { return d.id ; });
    	// debug console.log(JSON.stringify(displaynameById, null, "  ")); 

		// NB. When rollup: IF got rows with PFAs but no partnerships CANT simply use length - need to SUM a numeric field

		// Array of partnerships (ie not per PFA) for datatable
		// ie merge duplicate rows -> one Partnershipname + one PoliceIDs (comma separated)
		var dataById = dataNest(data);			// now function so can call again on update
			// debug: 
			//console.log('dataById (aka MAP OBJECT of Nested data)');
			//console.log(JSON.stringify(dataById, null, "  "));

		// Total no. partnerships per PFA
		totalByPFA = d3.nest()
			.key(function(d) { return d.PoliceIDs; })
			//.rollup(function(v) { return {count: d3.sum(v, function(d) { return d.Total; }) }; })
			// NB nest in 2nd key ('Total') so matches other rollups below which have 2 keys
			.key(function(d) { return "Total"; })
			.rollup(function(v) { return {
				count: d3.sum(v, function(d) { return d.Total; }) 
			}; })
			.map(data);
			// debug: 
			//console.log(JSON.stringify(totalByPFA, null, "  "));

		// Split by AREA type (regional/local/..); per PFA ID
		areaByPFA = d3.nest()
			.key(function(d) { return d.PoliceIDs; })
			.key(function(d) { return d.area; })
			.rollup(function(v) { return {
				 count: d3.sum(v, function(d) { return d.Total; })
			}; })
			.map(data);
			// debug: 
			//console.log(JSON.stringify(areaByPFA, null, "  "));

		// Split by CHAIR organisation type (Police/LA/NHS...); per PFA ID
		chairedByPFA = d3.nest()
			.key(function(d) { return d.PoliceIDs; })
			.key(function(d) { return d.chaired; })
			.rollup(function(v) { return {
				 count: d3.sum(v, function(d) { return d.Total; })
			}; })
			.map(data);
			// debug: 
			//console.log(JSON.stringify(chairedByPFA, null, "  "));

		// Split by COORDINATOR organisation type (Police/LA/NHS...); per PFA ID
		coordinatedByPFA = d3.nest()
			.key(function(d) { return d.PoliceIDs; })
			.key(function(d) { return d.coordinated; })
			.rollup(function(v) { return {
				 count: d3.sum(v, function(d) { return d.Total; })
			}; })
			.map(data);
			// debug: 
			//console.log(JSON.stringify(coordinatedByPFA, null, "  "));


		// Split by ACTIVITIES  (Community awareness raising/Intelligence sharing...); per PFA ID
		// 1: Nest by PFA; rollup activities into one list (process in step2)
		activitiesByPFA = d3.nest()
			.key(function(d) { return d.PoliceIDs; })
			.rollup(function(v) { return {
				// just store as one string
				activities: v.reduce(function(string, d) { return string += d.activities + ","; }, '')
			}; })
			.map(data);
			// debug: 
			//console.log(JSON.stringify(activitiesByPFA, null, "  "));

		// 2. grab list activities -> push counts into array -> add to activitiesByPFA in correct structure
		var allActivities = []; 					// master list (for checking / creating dropdowns)
		activitiesByPFA.each(function (item, pfa) {
			// for each PFA...
			//console.log('items for ' + pfa );
			//console.log(JSON.stringify(item, null, "  "));

			// grab list activities...
			//activitiesList = item['activities'].replace(/(^,)|(,$)/g, "");				// OK
			//console.log('activitiesList ' + activitiesList );			
			activitiesArray = item['activities'].replace(/(^,)|(,$)/g, "").replace(/,\s/g, ",").split(",");
			// replace(/(^,)|(,$)/g, "") = strip trailing comma (all have this)
			// replace(/,\s/g, ",")		 = replace "comma space" with "comma" in case mix of "foo,bar" & "foo, bar"
			//console.log('activitiesArray ');
			//console.log(JSON.stringify(activitiesArray, null, "  "));

			// count activities & push count to object...
			var counts = {};
			for (var i = 0; i < activitiesArray.length; i++) {
			  var num = activitiesArray[i].replace(/^Other:.*/, "Other");  // strip details from Other so all selected togther
			  counts[num] = counts[num] ? counts[num] + 1 : 1;
			}
			//console.log('counts ');
			//console.log(JSON.stringify(counts, null, "  "));

			// add each activity & count into activitiesByPFA array...
			var pfavar = '$' + pfa;
			for (var key in counts) {
			    if (counts.hasOwnProperty(key) && key != '') {
			        //console.log(pfavar + ': ' + key + " -> " + counts[key]);
					// testing inserts: activitiesByPFA[pfavar][key] = counts[key];		// OK !
					var keyvar = '$' + key;
					activitiesByPFA[pfavar][keyvar] = { 'count' : counts[key]};   			// OK !!

					// also push each activity into master list (for checking / creating dropdowns)
					allActivities.push(key);
			    }
			}

		});
		//console.log('all activities...'); 
		// list unique set from array...
		//uniqueActivities = Array.from(new Set(allActivities));
		//console.log(JSON.stringify(uniqueActivities.sort(), null, "  "));
		//console.log('activitiesByPFA...');
		//console.log(JSON.stringify(activitiesByPFA, null, "  "));



	  	// DRAW MAP
	  	///////////////////////////////////////////////////////////////
		svg.append("g")
			.attr("class", "police_force_areas")
	    	.selectAll("path")
			.data(topojson.feature(uk, uk.objects.policeforceareas_uk_4326).features) 
			.enter().append("path")
			.attr("d", path)
			.style("stroke", "#666666")
			//Adding mouseevents eg see http://bl.ocks.org/KoGor/5685876
			.on("mouseover", function(d) {
				var id = '$' + d.properties.id;
			    d3.select(this).transition().duration(300).style("opacity", 1);
			    div.transition().duration(300)
			    .style("opacity", 1)
				// improve style??
				div.html("<h4>" + displaynameById[id]['title'] + '</h4>')
			    //div.html("<h4>" + dataById[id][0]['title'] + '</h4> <dl class="dl-horizontal"> <dt>Regional</dt><dd>' + dataById[id][0]['regional'] + '</dd>' + '<dt>Subregional</dt><dd>' + dataById[id][0]['subregional'] + '</dd>' + '<dt>Local</dt><dd>' + dataById[id][0]['local'] + '</dd></dl>')


			    	// Reg: " + dataById[id][0]['regional'] + " SubReg: " + dataById[id][0]['subregional'] + " Local: " + dataById[id][0]['local'] + " Total: " + dataById[id][0]['count'])


			    .style("left", (d3.event.pageX) + "px")
			    .style("top", (d3.event.pageY -30) + "px");
			})
			.on("mouseout", function() {
			    d3.select(this)
			    .transition().duration(300)
			    .style("opacity", 0.8);
			    div.transition().duration(300)
			    .style("opacity", 0);
			 })
			.style("fill", function(d) { 
				return (colourise(d.properties.id));		// colourise ie lookup value on colour scale

	}); // end ready??

	  	// DRAW DATATABLE
	  	///////////////////////////////////////////////////////////////

		/*	 target = #data
	  	     dataById = map of all partnerships eg
			"$1": {
			    "ID": "1",
			    "PartnershipName": "Cheshire Anti-Slavery Network ",
			    "count": 2,
			    "PoliceIDs": "cheshire,greatermanchester",
			    "Activities": "foo;bar;too"
			  },
	  		displaynameById = map of police force display names by id
	  			eg displaynameById['greatermanchester'] => 'Greater Manchester'  */

	  	// populate initial title
	  	document.getElementById("title").innerHTML = "All partnerships";

		// create table
		var table = d3.select('#data').append('table')
			.attr("class", "table table-condensed table-striped")
			.attr("id", "table");
		var thead = table.append('thead');
		var	tbody = table.append('tbody')
			.attr("id", "tbody");

		// add table headers
		var headers = thead.append('tr');
		// TMP extra ID whilst checking data		
headers.append('th').text('ID');
		headers.append('th').text('Partnership name');
		headers.append('th').text('Police Force');
		// TMP extras whilst checking data	
		//headers.append('th').text('Area');
		//headers.append('th').text('Chair');
		//headers.append('th').text('Coordinator');
		headers.append('th').text('Activities');

		// create a row for each object in the data (NB manually specify format of each TD)
		drawtablebody (dataById, tbody);		// dataById = map of nested data

// WAS HERE	}); // end ready


	// DATATABLE ON CLICK
	/////////////////////
	d3.selectAll('#data').selectAll("tr")
		.on('click', function() {
			// <tr id='xx'>
			var target = 'partnerships/' + this.id + '.html';
			//console.log(target);
			$('#myModal').modal('show').find('.modal-content').load(target);
		});


	// UPDATE MAP & DATATABLE
	///////////////////////////////////////////////////////////////
	d3.selectAll(".select").on("input", function() {
		// set current dataset & currentGroup
		current = this.options[this.selectedIndex].value;
		currentGroup = this.id;
		// debug console.log('Select changed to: ' + current + ' in group: ' + currentGroup + ' so datasets for title is ' + dataset);

		// Reset other dropdowns (only 1 active at a time)
		dropdowns.forEach (function(dropdown) {
			if (dropdown != currentGroup) {
				document.getElementById(dropdown).selectedIndex = null; 	// reset this dropdown
			}
	    });

		// Update title of dataset
		updateTitle();

		// Update map colours & mousevents
		d3.selectAll("path")
			.style("fill", function(d) { 
				return (colourise(d.properties.id));		// colourise ie lookup value on colour scale
			})
			/*.on("mouseover", function(d) {
				var id = '$' + d.properties.id;
				// this is empty ie dont work
				// ********************
		    	// d3.select(this).text(d.properties.id + " : " + dataById[id][0][current])
		    })*/


		// Update datatable
		// currentGroup = eg area; current = eg Regional
			//console.log ('Filter to ' + currentGroup + ' = ' + current);
		if (current == 'Total') {
			dataById = dataNest(data); 			// base off whole dataset
		} else if (currentGroup == 'activities') {
			// Activities so look for "contains" current tag (not ===)

			// filter original data, then nest+rollup+map this (& then use this new map for tbody)
			var filteredData = data.filter(function(row){
				//console.log(JSON.stringify(row, null, "  "));
	  			return row[currentGroup].indexOf(current) >= 0
			});
			dataById = dataNest(filteredData);		// updated dataById
			//console.log('new FILTERED dataById (aka MAP OBJECT of Nested data)');
			//console.log(JSON.stringify(dataById, null, "  "));
		} else {
			// filter original data, then nest+rollup+map this (& then use this new map for tbody)
			var filteredData = data.filter(function(row){
				//console.log(JSON.stringify(row, null, "  "));
	  			return row[currentGroup] === current;
	  			// TEST Area/Regional
	  			//return row['area'] === 'Regional';	
			});
			dataById = dataNest(filteredData);		// updated dataById
			//console.log('new FILTERED dataById (aka MAP OBJECT of Nested data)');
			//console.log(JSON.stringify(dataById, null, "  "));
		}

		// remove old tbody & add new
		var table = document.getElementById("table");
		var tbody = document.getElementById("tbody");
		table.removeChild(tbody);

		var table = d3.select('#table');			// D3 not JS element!
		var	tbody = table.append('tbody')
			.attr("id", "tbody");
		drawtablebody (dataById, tbody);			// use dataById data to recreate tbody

		// DATATABLE ON CLICK
		d3.selectAll('#data').selectAll("tr")
			.on('click', function() {
				// <tr id='xx'>
				var target = 'partnerships/' + this.id + '.html';
				//console.log(target);
				$('#myModal').modal('show').find('.modal-content').load(target);
			});

		// Update svg for download
/*		var svgData = document.getElementById("svg").outerHTML;
		var svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
		var svgUrl = URL.createObjectURL(svgBlob);	
		var downloadLink = 	document.getElementById("downloadLink");
		downloadLink.href = svgUrl;
		downloadLink.download = "partnerships." + current + ".svg";
*/
	});  // end update map



    // LEGEND see http://d3-legend.susielu.com/
    ///////////////////////////////////////////////////////////////
	var legendsvg = d3.select("#map").append("svg")
    	.attr("width", width)
    	.attr("height", 50);

    svg.append("g")
  		.attr("class", "legendThreshold")
  		.attr("transform", "translate(200,700)");

    var legend = d3.legendColor()
	    .scale(color) 						// creates lengend based on this D3 scale
	    .labelFormat(d3.format(".2")) 		// Takes a d3.format and applies that styling to the legend labels
	    .labels([0, 1, 2, '3 - 4', '5+ '])				// custom cells
	    //.labels(d3.legendHelpers.thresholdLabels)
	    .shapeWidth(50)						// wider so can fit labels in
	    .orient('horizontal');

 	svg.select(".legendThreshold")
  		.call(legend);



	// DOWNLOAD SVG button
	///////////////////////////////////////////////////////////////
/*
	// https://stackoverflow.com/questions/23218174/how-do-i-save-export-an-svg-file-after-creating-an-svg-with-d3-js-ie-safari-an
	var svgData = document.getElementById("svg").outerHTML;
	var svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
	var svgUrl = URL.createObjectURL(svgBlob);
	var downloadLink = document.createElement("a");
	downloadLink.id = 'downloadLink';
	downloadLink.href = svgUrl;
	downloadLink.download = "partnerships." + current + ".svg";
	var linkText = document.createTextNode("Download this map as SVG");
	downloadLink.appendChild(linkText);
	document.getElementById("download").appendChild(downloadLink);
*/
}   	// end ready ???


// FUNCTIONS
//////////////////////////////////////////////////////////////////

function updateTitle() {
	// Update title of dataset; above datatable
	var dataset = 'datasets' + currentGroup[0].toUpperCase() + currentGroup.slice(1); // need to capitalise!
	if (current == 'Total') {
		title = "All partnerships"; 			// override lookup or get eg "Chaired by..." not "All"
	} else {
		if (currentGroup == 'chaired' ) {
			title = "Chaired by " + eval(dataset)[current];
		} else if (currentGroup == 'coordinated') {
			title = "Coordinated by " + eval(dataset)[current];
		} else {
			title = eval(dataset)[current];
		}
	}
	document.getElementById("title").innerHTML = title;
}


function createDropdown (id, dataset)
{
	// Display dropdown to choose other datasets
	//console.log ('dropdown ID: ' + id);
	//console.log(JSON.stringify(dataset, null, "  "));

	var select = document.createElement("select");
	select.id = id;
	select.className = 'select';

	for(var index in dataset) 
	{ 
    	var title = dataset[index]; 
		var item = document.createElement("option");
		item.value = index;
		var titleText = document.createTextNode(title);
		item.appendChild(titleText);
		select.appendChild(item);
	} 

	document.getElementById("dropdowns").appendChild(select);
}


function dataNest(data)
{
	// use rollup & reduce to merge duplicate rows -> one Partnershipname + one PoliceIDs (comma separated)
  	dataById = d3.nest()
  		.key(function(d) { return d.ID; })    		
	   	.rollup(function(v) { return {
			ID: v.reduce(function(string, d) { return string = d.ID; }, ''),
			PartnershipName: v.reduce(function(string, d) { return string = d.PartnershipName; }, ''),
			count: v.length,
			PoliceIDs: v.reduce(function(string, d) { return string += d.PoliceIDs + ","; }, '').replace(/(^\s*,)|(,\s*$)/g, ''),
			Activities: v.reduce(function(string, d) { return string = d.activities; }, ''),
			area: v.reduce(function(string, d) { return string = d.area; }, ''),
			chaired: v.reduce(function(string, d) { return string = d.chaired; }, ''),
			coordinated: v.reduce(function(string, d) { return string = d.coordinated; }, ''),
			count: v.length,
			}; })     	
		.map(data);		// CAN BE MAP (EASIER TO HANDLE) DONT NEED TO BE ARRAY AS ALREADY FILTERED
	return(dataById);
}


function colourise (pfaID)
{
	// pass data value to color function, return color based on domain and range

	//var id = '$' + d.properties.id; 		// ID: in LAD json is simply d.id; in police json is NESTED in properties ie: d.properties.id
	var id = '$' + pfaID;
	var currentset = '$' + current;

	if (current == 'Total') {
		var dataset = 'totalByPFA';  			//  use totalByPFA map for lookup (not eg area or chaired)
	} else {
		var dataset = currentGroup + 'ByPFA';  // 'currentGroup' holds eg area -> use areaByPFA map for lookup
	}

	if (eval(dataset)[id])
	{
		// ID (ie PFA) exists... so check current variable exists ('currentset' holds current dataset eg regional or local)
		if (eval(dataset)[id][currentset])
		{
			//console.log ('--> HIT! ' + currentset + ' = ' + eval(dataset)[id][currentset]['count'] + ' in dataset:' + dataset + ' with id:' + id);
			return color(eval(dataset)[id][currentset]['count']);
		} else {
			//console.log ('Missing: No value for "' + currentset + '" in dataset:' + dataset + ' with id:' + id);
			return color('0');
		}
	} else {
		// ID (ie PFA) does NOT exist
		//console.log('Miss: No PFA in dataset:' + dataset + ' with id:' + id);
		return color('0');
	}
}

function drawtablebody(data, tbody)
{
	// print TR for each row in data array
	data.each(function(rowData) {
		//console.log('row inside drawTableBody...');
		//console.log(JSON.stringify(rowData, null, "  "));
		var row = tbody.append('tr')
			.attr("id", rowData['ID']);
		// TMP extra ID whilst checking data					
row.append('td').text(rowData['ID']);
		row.append('td').text(rowData['PartnershipName']);
		row.append('td').text(lookupPFA(rowData['PoliceIDs']));					// lookup displayname
		// TMP extras whilst checking data	
		//row.append('td').text(rowData['area']);
		//row.append('td').text(rowData['chaired']);
		//row.append('td').text(rowData['coordinated']);

		row.append('td').node().appendChild(listify(rowData['Activities']));	// turn into UL
	});

}


function listify(list)
{
	// explode ; separated list into Ul and LI
	if (list.length > 0) {
		var ul = document.createElement('ul');
		var array = list.split(',');
		array.forEach (function(item) {
			var li = document.createElement('li');
			li.appendChild(document.createTextNode(item));
	    	ul.appendChild(li);
	    });
		return ul;
	} else {
		var empty = document.createElement('div');
		//empty.appendChild(document.createTextNode('-')); 	// just plain text
		empty.innerHTML = '&mdash;';
		return empty; 	// empty list so print dash
	}
}

function lookupPFA(list)
{
	// explode , separated list and lookup proper police force displayname 
	var array = list.split(',');
	var outputArray = [];
	array.forEach (function(item) {
		id = '$' + item;
    	outputArray.push(displaynameById[id]['title']);
    });
	return outputArray.join('; ');		// create ; seperated string & return it
}
