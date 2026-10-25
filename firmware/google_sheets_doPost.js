// Inspired by https://gist.github.com/bmcbride/7069aebd643944c9ee8b
// 1. Create or open an existing Google Sheet
// 2. Tools > Script editor and enter this code
// 3. Go to end of this script and enter the url of the Google Sheet in function setup() 
// 4. In function setup() enter the LoRa device in SCRIPT_PROP.setProperty("pr-chirrp-2", doc.getId())
// 4. Save. From pulldown select setup and Run once
// 5. Go to Deploy>New Deployment. 
//    - Select type>Web app. 
//    - New description>'1' or whatever. 
//    - Execute as>Me(xx). 
//    - Who has access>Anyone.
// 4. Copy the URL use it in the TheThingsNetwork Webhook
//
// FOR DEBUGGING
// https://github.com/peterherrmann/BetterLog
//  Logger = BetterLog.useSpreadsheet('1B2AWsd1ERaQHfxh8OtDRngoFK0kGmNL4023jO8gaUHU'); 
//  Logger.log('running script');

var SHEET1 = "Sheet1";
var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service

function doGet(e){
  return handleResponse(e);
}

function doPost(e){
  return handleResponse(e);
}

function handleResponse(e) { 
  var lock = LockService.getPublicLock();
  lock.waitLock(60000); // wait 30 seconds before conceding defeat.
  
  //Logger = BetterLog.useSpreadsheet('1A69ebTrrdCOTvRgt-FyH8d0Jd42KkeDNpWNZXnKh_Yk'); // 'debug' google sheet 
  
  try { 
    var jsonData = JSON.parse(e.postData.contents);
    var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty(jsonData.end_device_ids.device_id)); // see setup() at end
    
    //Logger.log(jsonData.end_device_ids.device_id);
    
    var sheet = doc.getSheetByName(SHEET1);
       
 // we'll assume header is in row 1 but you can override with header_row in GET/POST data
    //var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nextRow = sheet.getLastRow()+1; // get next row
    var row = [];
    var headerRow = [];
    var d = new Date(); 
    // Time and Date updated to EST 
    dformat = [d.getFullYear(), d.getMonth() + 1, d.getDate()].join(' / ') + ' ' + [d.getHours(), d.getMinutes(), d.getSeconds()].join (' : '); 
    
// loop through the header columns.
// loops through each row to fill each column with its appropriate information 

    headerRow.push("device_id");
    headerRow.push("application_id");
    headerRow.push("received_at utc");
    headerRow.push("local_time"); 
    headerRow.push("f_cnt");

    var dpobj = jsonData.uplink_message.decoded_payload; // decoded payload object
    var dpobj_names = Object.getOwnPropertyNames(dpobj); // get names for decoded payload data, can change depending on device/sensor type
    
    //Logger.log(dpobj_names);
    //Logger.log(dpobj[dpobj_names[0]]);
    
    for (var i=0;i<dpobj_names.length; i++) {
      headerRow.push(dpobj_names[i])
    }
    
    // Gateway info header
    for (var i = 0; i < jsonData.uplink_message.rx_metadata.length; i++) {
      headerRow.push("gtw_id");
      headerRow.push("time");
      headerRow.push("rssi");
      headerRow.push("snr");
    }
    sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]); 
    
    // push adds elements to the end of the array 
    row.push(jsonData.end_device_ids.device_id);
    row.push(jsonData.end_device_ids.application_ids.application_id);
    row.push(jsonData.received_at);
    row.push(d); //New Date format /
    row.push(jsonData.uplink_message.f_cnt);

    for (var i=0;i<dpobj_names.length; i++) { // enters the decoded payload values but by alpha order of names 
      row.push(dpobj[dpobj_names[i]]);
    }
 
    for (var i = 0; i < jsonData.uplink_message.rx_metadata.length; i++) {
      var gateway = jsonData.uplink_message.rx_metadata[i];
      row.push(gateway.gateway_ids.gateway_id);
      row.push(gateway.time);
      row.push(gateway.rssi);
      row.push(gateway.snr);
    }

// more efficient to set values as [][] array than individually
    sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);

// return json success results
    return ContentService
    .createTextOutput(JSON.stringify({"result":"success", "row": nextRow}))
    .setMimeType(ContentService.MimeType.JSON);
  } catch(e) {

// if error return this
    return ContentService
    .createTextOutput(JSON.stringify({"result":"error", "error": e}))
    .setMimeType(ContentService.MimeType.JSON);
  } finally { //release lock
    lock.releaseLock();
  }
}

// This alows script to serve out data to multiple google sheets depending on
// the device. It associates the URL of the Google Sheet with the DevID
// In this example the DEVID is 'pr-chirrp-2'
function setup() {  

  SCRIPT_PROP.deleteAllProperties(); // clear properties

  // pr-chirrp-2 PUERTO RICO CHIRRP FS 2
  doc = SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/1T6J_FVXC9Bb17zSBJkQTBtJQlWu-8rdXw6vVuT7Tjdw/edit');
  SCRIPT_PROP.setProperty("pr-chirrp-2", doc.getId());  

}