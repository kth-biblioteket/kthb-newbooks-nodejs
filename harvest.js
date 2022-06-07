/**
 * 
 * TODO: Felhantering etc
 * 
 */
const https = require('https');
const axios = require('axios');
const nodecron = require('node-cron');
var parseString = require('xml2js').parseString;
var fs = require('fs');

var appath = "./";

const requestImageSize = require('request-image-size');

var mysql = require('mysql')

require('dotenv').config();

//Dagar tillbaks att hämta nya böcker
var days = process.env.DAYS;

var primoxserviceendpoint = process.env.PRIMO_XSERVICE_ENDPOINT;

var almaapiendpoint_ebooks
almaapiendpoint_ebooks = process.env.ALMA_ANALYTICS_API_ENDPOINT_EBOOKS + '&filter=<sawx:expr xsi:type="sawx:comparison" op="greaterOrEqual" xmlns:saw="com.siebel.analytics.web/report/v1.1" xmlns:sawx="com.siebel.analytics.web/expression/v1.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><sawx:expr xsi:type="sawx:sqlExpression">"E-Inventory"."Portfolio Activation Date"."Portfolio Activation Date"</sawx:expr><sawx:expr xsi:type="sawx:sqlExpression">TIMESTAMPADD(SQL_TSI_DAY, -' + days + ', CURRENT_DATE)</sawx:expr></sawx:expr>&limit=25';

var almaapiendpoint_pbooks
almaapiendpoint_pbooks = process.env.ALMA_ANALYTICS_API_ENDPOINT_PBOOKS + '&filter=<sawx:expr xsi:type="sawx:comparison" op="greaterOrEqual" xmlns:saw="com.siebel.analytics.web/report/v1.1" xmlns:sawx="com.siebel.analytics.web/expression/v1.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><sawx:expr xsi:type="sawx:sqlExpression">"Physical Item Details"."Receiving Date (Calendar)"</sawx:expr><sawx:expr xsi:type="sawx:sqlExpression">TIMESTAMPADD(SQL_TSI_DAY, -' + days + ', CURRENT_DATE)</sawx:expr></sawx:expr>&limit=25';


function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

function util(url) {
	return new Promise((resolve, reject) => {
		requestImageSize(url)
			.then(img => resolve({
				err: "",
				width: img.width,
				height: img.height
			}))
			.catch(err => 
				resolve({
					error: err,
					width: 0,
					height: 0
		  		})
			);
	})
}

function addgooglecover(records,index, booktype, con) {
	var thumbnail = "";
	thumbnail =	records[index].thumbnail;
	var coverURL = "";
	axios.get(thumbnail)
		.then(async googleres => {
			var googleresponse = googleres.data.replace("updateGBSCover(","");
			googleresponse = googleresponse.replace(");","");
			googleresponse = JSON.parse(googleresponse);
			for (var key in googleresponse) {
				if (typeof googleresponse[key].thumbnail_url != 'undefined'){
					coverURL = googleresponse[key].thumbnail_url.replace("proxy-eu.hosted.exlibrisgroup.com/exl_rewrite/","");
					sql = "UPDATE books SET coverurl = '" + coverURL + "'" + 
						" WHERE id = '" + records[index].id + "'";
					con.query(sql)
				}
			}
			if(coverURL == "") {
				//syndetics som backup om inte google har omslaget
				coverURL = 'https://secure.syndetics.com/index.aspx?isbn=' + records[index].isbnprimo + '/lc.gif&client=primo&type=unbound&imagelinking=1';
				//let img = await util(coverURL)
				console.log("isbnprimo: " + records[index].isbnprimo)
				const img = await axios.get(coverURL)
    			if(img.headers['content-length']=='6210') {
					coverURL = process.env.DEFAULT_COVER_URL
					console.log("content-length: 6210");
				}
				if( records[index].isbnprimo == '') {
					coverURL = process.env.DEFAULT_COVER_URL
					console.log("empty isbn");
				}

				sql = "UPDATE books SET coverurl = '" + coverURL + "'" + 
						" WHERE id = '" + records[index].id + "'";
				con.query(sql)
			}
			index++;
			if (index < records.length){
				//modulo
				if( index % 50 == 0 ){
					currentdate = new Date();
					fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + "Harvest, googlecover index: " + index + "...\n", function (err) {
						if (err) throw err;
					});
					console.log("index: " + index + "...");
				}
				addgooglecover(records,index, booktype, con);
			} else {
				currentdate = new Date();
				fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + "Harvest, addgooglecover finished \n", function (err) {
					if (err) throw err;
				});
				console.log("addgooglecover finished");
				//Avsluta transaktion när hela processen är klar.
				con.commit(function(error) {
					if (error) { 
						con.rollback(function() {
					  	});
					}
					currentdate = new Date();
					fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + "Harvest, Database Transaction Complete \n", function (err) {
						if (err) throw err;
					});
					fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + " Harvest, Finished! \n", function (err) {
						if (err) throw err;
					});
					console.log('Transaction Complete.');
				});
			}
		})
		.catch(error => {
			console.log("GoogleError: " + error);
		});
}

function callprimoxservice(records,index, booktype, con) {
	var endpoint = primoxserviceendpoint + '?json=true&institution=46KTH&onCampus=true&query=addsrcrid,exact,' + records[index].mmsid + '&indx=1&bulkSize=10&loc=local,scope:(46KTH)&loc=adaptor,primo_central_multiple_fe';	
	axios.get(endpoint)
		.then(response => {
			if(typeof response.data.SEGMENTS.JAGROOT.RESULT.DOCSET.DOC !== 'undefined') {
				var isbnprimo = "";
				if(typeof response.data.SEGMENTS.JAGROOT.RESULT.DOCSET.DOC.PrimoNMBib.record.search.isbn !== 'undefined') {
					if(booktype == "E") {
						isbnprimo = response.data.SEGMENTS.JAGROOT.RESULT.DOCSET.DOC.PrimoNMBib.record.search.isbn[0];
					} else {
						isbnprimo = records[index].isbn
					}
				}
				var thumbnail = "";
				if(typeof response.data.SEGMENTS.JAGROOT.RESULT.DOCSET.DOC.LINKS.thumbnail !== 'undefined') {
					thumbnail = response.data.SEGMENTS.JAGROOT.RESULT.DOCSET.DOC.LINKS.thumbnail[1];
				}
				sql = "UPDATE books SET recordid = '" + response.data.SEGMENTS.JAGROOT.RESULT.DOCSET.DOC.PrimoNMBib.record.control.recordid + 
					"' ,isbnprimo = '" + isbnprimo + 
					"' ,thumbnail = '" + thumbnail + 
					"' WHERE mmsid = '" + records[index].mmsid + "'";
				con.query(sql)
			} else {
				fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + "recordid saknas, mmsid: " + records[index].mmsid + "...\n", function (err) {
					if (err) throw err;
				});
				console.log("recordid saknas, mmsid: " + records[index].mmsid);
				console.log(JSON.stringify(response.data, null, 2));
				console.log(endpoint);
			}
			index++;
			if (index < records.length){
				//modulo
				if( index % 50 == 0 ){
					currentdate = new Date();
					fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + "Harvest, primoupdate index: " + index + "...\n", function (err) {
						if (err) throw err;
					});
					console.log("index: " + index + "...");
				}
				callprimoxservice(records,index, booktype, con);
			} else {
				currentdate = new Date();
				fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + " Harvest, primox finished \n", function (err) {
					if (err) throw err;
				});
				console.log("primox finished");
				con.query("SELECT * FROM books where booktype = '" + booktype + "' AND thumbnail != '' AND thumbnail != 'no_cover' and thumbnail != 'o'", function (error, result, fields) {
					if (error) {
						currentdate = new Date();
						fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + " Harvest, error selecting " + error + "\n", function (err) {
							if (err) throw err;
						});
					} else {
						addgooglecover(result,0,booktype, con);
					}
				});
			}
		})
		.catch(error => {
			console.log("Error, callprimoxservice: " + error + " mmsid: " + records[index].mmsid);
		});
}

function callalmaanalytics_E(endpoint, token, nrofprocessedrecords, con){
	var IsFinished = 'false';
	var booksarray = [];
	var mmsid;
	var isbn;
	var title;
	var activationdate;
	var dewey;
	var subject;
	var category;
	var subcategory;

	if(token!= '') {
		endpoint = endpoint + '&token=' + token;
	}
    	https.get(endpoint, (resp) => {
    	let data = '';

	resp.on('data', (chunk) => {
        	data += chunk;
	});

	resp.on('end', () => {
        	parseString(data, function (err, result) {
				if (typeof result.report.QueryResult !== 'undefined') {
					mmsid = '';
					isbn = '';
					title = '';
					activationdate = '';
					dewey = '';
					subject = '';
					category = '';
					subcategory = '';
					publicationdate = '';
					IsFinished = result.report.QueryResult[0].IsFinished[0];
					if(typeof result.report.QueryResult[0].ResumptionToken !== 'undefined') {
						token = result.report.QueryResult[0].ResumptionToken[0];
					}
					if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row !== 'undefined') {
						for (index in result.report.QueryResult[0].ResultXml[0].rowset[0].Row) {
							if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column5 !== 'undefined') {
								mmsid = result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column5[0];
							}
							if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column4 !== 'undefined') {
								isbn = result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column4[0].split(';')[0];
							}
							if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column6 !== 'undefined') {
								title = result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column6[0];
							}
							if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column10!== 'undefined') {
								activationdate = result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column10[0];
							}
							if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column11!== 'undefined') {
								publicationdate = result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column11[0];
							}
							if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column3 !== 'undefined') {
								dewey = result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column3[0];
							}
							if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column7 !== 'undefined') {
								if (result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column7 !== 'Unknown') {
									subject = result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column7[0];
								}
							}
							if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column8 !== 'undefined') {
								if (result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column8 !== 'Unknown') {
									category = result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column8[0];
								}
							}
							if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column9 !== 'undefined') {
								if (result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column9 !== 'Unknown') {
									subcategory = result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column9[0];
								}
							}
							//samla alla inserts i array och gör bara ett anrop efter iterationen är färdig.
							booksarray.push([mmsid, '', isbn, title, activationdate, publicationdate, dewey, subject, category, subcategory,'E']);
						}
						sql = "INSERT INTO books(mmsid, recordid, isbn, title, activationdate, publicationdate, dewey, subject, category, subcategory, booktype) VALUES ?";
						con.query(sql, [booksarray]);
						currentdate = new Date();
						fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + " Harvest, Inserted " + booksarray.length + " rows \n", function (err) {
							if (err) throw err;
						});
						console.log("inserted " + booksarray.length + " rows");
						nrofprocessedrecords = nrofprocessedrecords + booksarray.length;
						console.log("nrofprocessedrecords " + nrofprocessedrecords);
						//max xxx titlar
						if(IsFinished == 'false' && nrofprocessedrecords < 10000) {
							callalmaanalytics_E(almaapiendpoint_ebooks, token,nrofprocessedrecords);
						} else {
							con.query("SELECT * FROM books WHERE booktype = 'E' ORDER BY activationdate DESC LIMIT 10000", function (error, result, fields) {
								if (error) {
									currentdate = new Date();
									fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + " Harvest, Error selecting " + error + "\n", function (err) {
										if (err) throw err;
									});
								} else {
									callprimoxservice(result, 0, 'E', con);
								}
							});
						}
					} else {
						currentdate = new Date();
						fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + " Harvest, No new books to harvest! \n", function (err) {
							if (err) throw err;
						});
						fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + " Harvest, Finished! \n", function (err) {
							if (err) throw err;
						});
						console.log("No new books to harvest!");
						con.rollback(function() {
						});
					}

				}
			});
	});
	}).on("error", (err) => {
		console.log("Error: " + err.message);
	});
}

function callalmaanalytics_P(endpoint, token, nrofprocessedrecords, con){
	var IsFinished = 'false';
	var booksarray = [];
	var mmsid;
	var isbn;
	var title;
	var activationdate;
	var dewey;
	var subject;
	var category;
	var subcategory;

	if(token!= '') {
		endpoint = endpoint + '&token=' + token;
	}
    	https.get(endpoint, (resp) => {
    	let data = '';

	resp.on('data', (chunk) => {
        	data += chunk;
	});

	resp.on('end', () => {
        	parseString(data, function (err, result) {
				if (typeof result.report.QueryResult !== 'undefined') {
					mmsid = '';
					isbn = '';
					title = '';
					activationdate = '';
					dewey = '';
					subject = '';
					category = '';
					subcategory = '';
					publicationdate = '';
					IsFinished = result.report.QueryResult[0].IsFinished[0];
					if(typeof result.report.QueryResult[0].ResumptionToken !== 'undefined') {
						token = result.report.QueryResult[0].ResumptionToken[0];
					}
					if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row !== 'undefined') {
						for (index in result.report.QueryResult[0].ResultXml[0].rowset[0].Row) {
							if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column3 !== 'undefined') {
								mmsid = result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column3[0];
							}
							if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column2 !== 'undefined') {
								isbn = result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column2[0].split(';')[0];
							}
							if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column4 !== 'undefined') {
								title = result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column4[0];
							}
							if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column5!== 'undefined') {
								activationdate = result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column5[0];
							}
							if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column6!== 'undefined') {
								publicationdate = result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column6[0];
							}
							if (typeof result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column1 !== 'undefined') {
								dewey = result.report.QueryResult[0].ResultXml[0].rowset[0].Row[index].Column1[0];
							}
							//samla alla inserts i array och gör bara ett anrop efter iterationen är färdig.
							booksarray.push([mmsid, '', isbn, title, activationdate, publicationdate, dewey, '', '', '', 'P']);
						}
						sql = "INSERT INTO books(mmsid, recordid, isbn, title, activationdate, publicationdate, dewey, subject, category, subcategory, booktype) VALUES ?";
						con.query(sql, [booksarray]);
						currentdate = new Date();
						fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + " Harvest, Inserted " + booksarray.length + " rows \n", function (err) {
							if (err) throw err;
						});
						console.log("inserted " + booksarray.length + " rows");
						nrofprocessedrecords = nrofprocessedrecords + booksarray.length;
						console.log("nrofprocessedrecords " +nrofprocessedrecords);
						//max xxx titlar
						if(IsFinished == 'false' && nrofprocessedrecords < 500) {
							callalmaanalytics_P(almaapiendpoint_pbooks, token,nrofprocessedrecords);
						} else {
							con.query("SELECT * FROM books WHERE booktype = 'P' ORDER BY activationdate DESC LIMIT 500", function (error, result, fields) {
								if (error) {
									currentdate = new Date();
									fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + " Harvest, Error selecting " + error + "\n", function (err) {
										if (err) throw err;
									});
								} else {
									callprimoxservice(result, 0, 'P', con);
								}
							});
						}
					} else {
						currentdate = new Date();
						fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + " Harvest, No new books to harvest! \n", function (err) {
							if (err) throw err;
						});
						fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + " Harvest, Finished! \n", function (err) {
							if (err) throw err;
						});
						console.log("No new books to harvest!");
						con.rollback(function() {
						});
					}

				}
			});
	});
	}).on("error", (err) => {
		console.log("Error: " + err.message);
	});
}

function createnewbooksrecords(booktype) {
	//DB Connect
	var con = mysql.createConnection({
		host: process.env.DATABASE_SERVER,
		port: process.env.DATABASE_PORT,
		user: process.env.DATABASE_USER,
		password: process.env.DATABASE_PASSWORD,
		database: process.env.DATABASE_NAME
	});

	con.connect(function(error) {
		if (error) {
			currentdate = new Date();
			fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + " Harvest, Connection error: \n" + error, function (err) {
				if (err) throw err;
			});
			console.log("Error: " + error + " job terminated")
			//throw error;
		} else {
			
			//Start transaction!
			con.beginTransaction();
			sql = "DELETE FROM books WHERE booktype = '" + booktype + "'" ;

			con.query(sql, function (err, result) {
				if (err) { 
					con.rollback(function() {
						currentdate = new Date();
						fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + " Harvest, error deleting \n", function (err) {
							if (err) throw err;
						});
					});
				}
				currentdate = new Date();
				fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + " Harvest, Books deleted \n", function (err) {
					if (err) throw err;
				});
				console.log("Books deleted");
			});

			currentdate = new Date();
			fs.appendFile(appath + 'harvest.log', addZero(currentdate.getHours()) + ":" + addZero(currentdate.getMinutes()) + ":" + addZero(currentdate.getSeconds()) + " Harvest started. Days: " + days + "\n", function (err) {
				if (err) throw err;
			});

			if (booktype == 'E') {
				callalmaanalytics_E(almaapiendpoint_ebooks, '', 0, con);
			} else if (booktype == 'P') {
				callalmaanalytics_P(almaapiendpoint_pbooks, '', 0, con);
			} else {console.log("ange booktype!")}
		}

	});

}

const job = nodecron.schedule(process.env.CRON_PBOOKS, () => {
	console.log(new Date().toLocaleString());
	console.log("Cron Pbooks job started");
	createnewbooksrecords('P');	
});

const job2 = nodecron.schedule(process.env.CRON_EBOOKS, () => {
	console.log(new Date().toLocaleString());
	console.log("Cron Ebooks job started");
	createnewbooksrecords('E');	
});
