// Dimensions of sunburst.
var width = 750;
var height = 600;
var radius = Math.min(width, height) / 2;

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
  w: 75, h: 30, s: 3, t: 10
};

// Mapping of step names to colors.
var colors = {
  "home": "#5687d1",
  "product": "#7b615c",
  "search": "#de783b",
  "account": "#6ab975",
  "other": "#a173d1",
  "end": "#bbbbbb"
};

var colI = 0
function getRand(min, max) {
  colI++
  if(colI > max) {
    colI = 0
  }

  return colI
  // min = Math.ceil(min);
  // max = Math.floor(max);
  // return Math.floor(Math.random() * (max - min + 1)) + min;
}

var colors_ = ["#5687d1",
"#7b615c",
"rgb(22, 187, 110)",
"#de783b",
"#6ab975",
"#a173d1",
"rgb(204, 116, 116)",
"rgb(187, 22, 84)"]
// Total size of all segments; we set this later, after loading the data.
var totalSize = 0; 

var vis = d3.select("#chart").append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var vis1 = d3.select("#chart1").append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var partition = d3.partition()
    .size([2 * Math.PI, radius * radius]);

var arc = d3.arc()
    .startAngle(function(d) { return d.x0; })
    .endAngle(function(d) { return d.x1; })
    .innerRadius(function(d) { return Math.sqrt(d.y0); })
    .outerRadius(function(d) { return Math.sqrt(d.y1); });

// Use d3.text and d3.csvParseRows so that we do not need to have a header
// row, and can receive the csv as an array of arrays.
// d3.text("visit-sequences.csv", function(text) {
//   var csv = d3.csvParseRows(text);
//   var json = buildHierarchy(csv);
//   createVisualization(json);
// });

// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json, one=false) {


  // Bounding circle underneath the sunburst, to make it easier to detect
  // when the mouse leaves the parent g.
  (one ? vis1 : vis).append("svg:circle")
      .attr("r", radius)
      .style("opacity", 0);

  // Turn the data into a d3 hierarchy and calculate the sums.
  var root = d3.hierarchy(json)
      .sum(function(d) { return d.size; })
      .sort(function(a, b) { return b.value - a.value; });
  
  // For efficiency, filter nodes to keep only those large enough to see.
  var nodes = partition(root).descendants()
      .filter(function(d) {
          return (d.x1 - d.x0 > 0.005); // 0.005 radians = 0.29 degrees
      });

  var path = (one ? vis1 : vis).data([json]).selectAll("path")
      .data(nodes)
      .enter().append("svg:path")
      .attr("display", function(d) { return d.depth ? null : "none"; })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
      .style("fill", function(d) { d.one = one; d.color = colors_[getRand(0, 7)]; return d.color; })//colors[d.data.name]; })
      .style("opacity", 1)
      .on("mouseover", (e) => mouseover(e, one));

  // Add the mouseleave handler to the bounding circle.
  d3.select("#chart").on("mouseleave", e => mouseleave(e, one));
  d3.select("#chart1").on("mouseleave", e => mouseleave(e, one));

  // Get total size of the tree = value of root node from partition.
  totalSize = path.datum().value;
 };

// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d, one=false) {

  var percentage = (100 * d.value / totalSize).toPrecision(3);
  var percentageString = percentage + "%";
  if (percentage < 0.1) {
    percentageString = "< 0.1%";
  }

  // d3.select("#percentage")
  //     .text(percentageString);

  // d3.select("#explanation")
  //     .style("visibility", "");

  var sequenceArray = d.ancestors().reverse();
  sequenceArray.shift(); // remove root node from the array

  // console.log(sequenceArray, percentageString)
  html = ''
  sequenceArray.forEach(element => {
    html += '<div style="background:'+ element.color+'" >'+element.data.name+'</div>'
  });
  html +='<div id="perc">' + percentageString + '</div>'
  document.getElementById('explanation' + (d.one ? '1' : '')).innerHTML = html
  // updateBreadcrumbs(sequenceArray, percentageString);

  // // Fade all the segments.
  d3.selectAll("path")
      .style("opacity", 0.3);

  // // Then highlight only those that are an ancestor of the current segment.
  (d.one ? vis1 : vis).selectAll("path")
      .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
              })
      .style("opacity", 1);
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(e, one) {
  console.log(e, one)
  // Hide the breadcrumb trail
  // d3.select("#trail")
  //     .style("visibility", "hidden");

  // Deactivate all segments during transition.
  d3.selectAll("path").on("mouseover", null);

  // Transition each segment to full opacity and then reactivate it.
  d3.selectAll("path")
      .transition()
      .duration(10)
      .style("opacity", 1)
      .on("end", function() {
              d3.select(this).on("mouseover", mouseover);
            });
            document.getElementById('explanation').innerHTML = ''
            document.getElementById('explanation1').innerHTML = ''
  // d3.select("#explanation")
  //     .style("visibility", "hidden");
}

// Take a 2-column CSV and transform it into a hierarchical structure suitable
// for a partition layout. The first column is a sequence of step names, from
// root to leaf, separated by hyphens. The second column is a count of how 
// often that sequence occurred.
function buildHierarchy(csv) {
  var root = {"name": "root", "children": []};
  for (var i = 0; i < csv.length; i++) {
    var sequence = csv[i][0];
    var size = +csv[i][1];
    if (isNaN(size)) { // e.g. if this is a header row
      continue;
    }
    var parts = sequence.split("-");
    var currentNode = root;
    for (var j = 0; j < parts.length; j++) {
      var children = currentNode["children"];
      var nodeName = parts[j];
      var childNode;
      if (j + 1 < parts.length) {
   // Not yet at the end of the sequence; move down the tree.
 	var foundChild = false;
 	for (var k = 0; k < children.length; k++) {
 	  if (children[k]["name"] == nodeName) {
 	    childNode = children[k];
 	    foundChild = true;
 	    break;
 	  }
 	}
  // If we don't already have a child node for this branch, create it.
 	if (!foundChild) {
 	  childNode = {"name": nodeName, "children": []};
 	  children.push(childNode);
 	}
 	currentNode = childNode;
      } else {
 	// Reached the end of the sequence; create a leaf node.
 	childNode = {"name": nodeName, "size": size};
 	children.push(childNode);
      }
    }
  }
  return root;
};



text = `Govermental Organisation-Ministry Of Environmental Protection And Agriculture Of Georgia,43
Govermental Organisation-Ministry Of Education And Science Of Georgia,12
Govermental Organisation-Parliament,11
Govermental Organisation-Governmental Organizations   Not Specified,10
Govermental Organisation-Government,6
Govermental Organisation-Human Rights Secretariat Of The Governmental Administration,6
Govermental Organisation-Ministry Of Finance,4
Govermental Organisation-Ministry Of Agriculture Of Ajara,4
Govermental Organisation-Ministry Of Health,3
Govermental Organisation-Labour And Social Affairs Of Georgia,3
Govermental Organisation-Supreme Council Of Ajara,3
Govermental Organisation-Government (Ajara),2
Govermental Organisation-Ministry Of Regional Development And Infrastructure,1
Govermental Organisation-Ministry Of Economy And Sustainable Development Of Georgia,1
Govermental Organisation-Ministry Of Regional Development And Infrastructure Of Georgia,1
Govermental Organisation,ministry of regional development and infrastructure of georgia
UN Partner/Donor-Eu,35
UN Partner/Donor-UNDP,27
UN Partner/Donor-Fao,6
UN Partner/Donor-Mtpfo Office,6
UN Partner/Donor-Un Agencies   Internal,5
UN Partner/Donor-Un Headquarters,4
UN Partner/Donor-Unicef,3
UN Partner/Donor-UNDP Brussel'S Office,2
UN Partner/Donor-Donors   Not Specified,2
UN Partner/Donor-Gcf,2
UN Partner/Donor-Ohchr,2
UN Partner/Donor-Unido,1
UN Partner/Donor-Iom,1
UN Partner/Donor-Monreal Protocol Secretariat,1
UN Partner/Donor-Sdgs Fund,1
UN Partner/Donor,sdgs fund
Target Audience,39
National Agency / Center / Lepl-Protected Areas Agency Of Georgia,8
National Agency / Center / Lepl-Georgian National Environmental Agency   Nea,5
National Agency / Center / Lepl-National Statistics Office Of Georgia   Geostat,3
National Agency / Center / Lepl-Pdo,3
National Agency / Center / Lepl-National Food Agency,3
National Agency / Center / Lepl-Gender Equality Council,2
National Agency / Center / Lepl-National Forestry Agency,1
National Agency / Center / Lepl-Public Service Development Agency (Psda),1
National Agency / Center / Lepl-Emergency Management Agency,1
National Agency / Center / Lepl,emergency management agency
Academia-Academia (In General),8
Academia-Vet Centers (In General),2
Academia-Institut Of Ecology,1
Academia,Institut of Ecology
Local Non Govermental Organisation,19
Countries-Government Of Sweden,5
Countries-Swiss Cooperation Office (Sco) In South Caucasus,4
Countries-Sdc Swiss Agency For Development Cooperation,4
Countries-USAID,3
Countries-Austrian Development Cooperation (Adc),2
Countries-Danish Government,2
Countries-Brittish Government,2
Countries-Usiad,1
Countries-Governments Of Germany,1
Countries-Government Of Norway,1
Countries-Government Of Flanders,1
Countries,Government of Flanders
Local Municipal Entities-Government Of Sweden,5
Local Municipal Entities-Swiss Cooperation Office (Sco) In South Caucasus,4
Local Municipal Entities-Sdc Swiss Agency For Development Cooperation,4
Local Municipal Entities-USAID,4
Local Municipal Entities-Austrian Development Cooperation (Adc),2
Local Municipal Entities-Danish Government,2
Local Municipal Entities-Brittish Government,2
Local Municipal Entities-Governments Of Germany,1
Local Municipal Entities-Government Of Norway,1
Local Municipal Entities-Government Of Flanders,1
Local Municipal Entities,Government of Flanders
International Organization,9
Steering Comitee,6
Enpard   Monitoring Evaluation Body,4
Target Audiance,3
Project Executive Board (Consist Of UNDP Representatives,3
Ministry Of Agriculture Representatives,3
Members Of Others NGO,3
Stakeholders,3
Eu Delegation In Georgia,2
Media And Social Media,2
Experts Representing Revenue Service,1
Environmental Inspectors,1
Private Companies,1`
var csv = d3.csvParseRows(text);
var json1 = buildHierarchy(csv);

var text2 = `Academia,33
Academia-Zugdidi State University,6
Academia-Kachreti,4
Academia-Gtu,4
Academia-Aisi,2
Academia-Gantsiadi,2
Academia-Iliauni,2
Academia-Akaltsihe,2
Academia-Iberia,2
Academia-Prestige,2
Academia-Black Sea College,2
Academia-Poti,2
Academia-Ecological Academy,1
Academia-Isic (College),1
Academia-Media And Tv   Art College,1
Academia,Media and TV - Art college
Local Non Govermental Organisation-Local Ngos,16
Local Non Govermental Organisation-Alert,6
Local Non Govermental Organisation-Cihbff,4
Local Non Govermental Organisation-Amilatt Resurskua,4
Local Non Govermental Organisation-IDFI,4
Local Non Govermental Organisation-Georgia'S Environmental Outlook,4
Local Non Govermental Organisation-Batumi Business Incubator,4
Local Non Govermental Organisation-Ochamchira Youth House,2
Local Non Govermental Organisation-Tanadgoma,2
Local Non Govermental Organisation-Fund Abkhazintercont,2
Local Non Govermental Organisation-Center For Peace And Civil Development,2
Local Non Govermental Organisation-Innovative Education Foundation,2
Local Non Govermental Organisation-Children'S Fund Abkhazia,2
Local Non Govermental Organisation-Csrdg,2
Local Non Govermental Organisation-Institute For The Study Of Nationalism And Conflicts,2
Local Non Govermental Organisation-Association For People And Business Caucasus,2
Local Non Govermental Organisation-Amra2014,1
Local Non Govermental Organisation-Amra 2014,1
Local Non Govermental Organisation-Union Samkaro,1
Local Non Govermental Organisation-World Experience For Georgia,1
Local Non Govermental Organisation,World Experience for Georgia
National Agency / Center / Lepl-Georgian National Environmental Agency   Nea,8
National Agency / Center / Lepl-Civil Service Burreau,5
National Agency / Center / Lepl-National Center For Education Quality Enhancement,4
National Agency / Center / Lepl-Public Service Development Agency (Psda),3
National Agency / Center / Lepl-Public Service Hall,3
National Agency / Center / Lepl-Data Exchange Agency,3
National Agency / Center / Lepl-Apa,2
National Agency / Center / Lepl-Environmental Information And Education Center,2
National Agency / Center / Lepl-Agricultural And Rural Development Agency,2
National Agency / Center / Lepl-National Forestry Agency,2
National Agency / Center / Lepl-Emergency Management Agency,1
National Agency / Center / Lepl-Environmental Information And Educational Center,1
National Agency / Center / Lepl,environmental information and educational center
Association,17
International Organization,10
UN Partner/Donor-EU,35
UN Partner/Donor-UNDP,27
UN Partner/Donor-FAO,6
UN Partner/Donor-Mtpfo Office,6
UN Partner/Donor-UN Agencies Internal,5
UN Partner/Donor-UN Headquarters,4
UN Partner/Donor-Unicef,3
UN Partner/Donor-UNDP Brussel'S Office,2
UN Partner/Donor-Donors   Not Specified,2
UN Partner/Donor-GCF,2
UN Partner/Donor-OHCHR,2
UN Partner/Donor-Unido,1
UN Partner/Donor-IOM,1
UN Partner/Donor-Monreal Protocol Secretariat,1
UN Partner/Donor-SDGs Fund,1
Various Deployed Experts,3
Chief Technical Advisor Particular Person (Consultant),2
Local Municipal Entities,1
Governmental Organization,1`

var csv = d3.csvParseRows(text2);
var json2 = buildHierarchy(csv);
createVisualization(json1);
createVisualization(json2, true);
