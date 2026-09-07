
window.onclick = function(event) 
{
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

var SavableItems = "SystemTrap-System-StartupSystem startup1This trap will occur when the Head Station has started or restarted its firmware.Trap-Sys-Fail-ActivatedSystem failure activated1This trap will occur if any of the following problems occur:<br><ul><li>License is not present.</li><li>System voltage is too low.</li><li>Current consumption is critical.</li><li>Internal temperature is critical.</li><li>Current consumption overload, modules temporarily disabled.</li><li>SD-Card interface problem.</li><li>General system errors</li></ul>Trap-Sys-Fail-ClearedSystem failure cleared1This trap will occur if a System failure has been resolved.Trap-Io-Fail-ActivatedI/O failure activated1This trap will occur if any of the following problems occur:<br><ul><li>There is a high speed module in a low speed area.</li><li>There are more modules plugged than the license allows.</li><li>General I/O errors</li></ul>Trap-Io-Fail-ClearedI/O failure cleared1This trap will occur if a I/O failure has been resolved.Power modules (PWR-6A, 101-230010, Hardware revision V1.4 and newer)Trap-PowerMod-Balance-FailLoad sharing balance failure1This trap will occur if the current delivery balance difference between 2 Power modules exceeds 50%.Trap-PowerMod-Balance-RestoreLoad sharing balance restored1This trap will occur if the current delivery balance difference between 2 Power modules is restored below 45%.Trap-PowerMod-ExtPower-FailExternal power failure1This trap will occur if the external power supply fails.Trap-PowerMod-ExtPower-RestoreExternal power restore1This trap will occur if the external power supply is restored.Trap-PowerMod-Voltage-LowBackplane voltage too low1This trap will occur if the measured backplane voltage drops below 5.5V.Trap-PowerMod-Voltage-HighBackplane voltage too high1This trap will occur if the measured backplane voltage exceeds 6.4V.Trap-PowerMod-Voltage-RestoreBackplane voltage restored1This trap will occur if the measured backplane voltage is restored to normal: between 5.6V and 6.3V.Trap-PowerMod-Current-HighCurrent delivery too high1This trap will occur if the current delivery exceeds the limit.Trap-PowerMod-Current-RestoreCurrent delivery restored1This trap will occur if the current delivery is restored to normal.Trap-PowerMod-Comm-FailCommunication failure1This trap will occur if the communication with a power module fails.Trap-PowerMod-Comm-RestoreCommunication restored1This trap will occur if the communication with a power module is restored.Trap-PowerMod-RemoveModule removed from system1This trap will occur if a power module is removed from the system.Trap-PowerMod-ReinsertModule reinserted into system1This trap will occur if a power module is reinserted into the system.Physical MeasurementsTrap-Bargraph-LowBargraph is too low1This trap will occur if the bargraph of a device is too low.Trap-Bargraph-HighBargraph is too high1This trap will occur if the bargraph of a device is too high.Trap-Bargraph-RestoredBargraph is restored1This trap will occur if the bargraph of a device is restored to a normal level.Trap-Jitter-HighPA Scope: Jitter is too high1This trap will occur if the jitter of a device connected to a PA module is too high.Trap-Jitter-RestoredPA Scope: Jitter is restored1This trap will occur if the jitter of a device connected to a PA module is restored to a normal level.Trap-DC-Voltage-LowPA Scope: DC Voltage is too low1This trap will occur if the DC Voltage of a PA module is too low.Trap-DC-Voltage-HighPA Scope: DC Voltage is too high1This trap will occur if the DC Voltage of a PA module is too high.Trap-DC-Voltage-RestoredPA Scope: DC Voltage is restored1This trap will occur if the DC Voltage of a PA module is restored to a normal level.Trap-DC-Noise-HighPA Scope: DC Noise is too high1This trap will occur if the DC noise of a PA module is too high.Trap-DC-Noise-RestoredPA Scope: DC Noise is restored1This trap will occur if the DC noise of a PA module is restored to a normal level.Trap-DC-Current-HighPA Scope: DC Current is too high1This trap will occur if the DC current of a PA module is too high.Trap-DC-Current-RestoredPA Scope: DC Current is restored1This trap will occur if the DC current of a PA module is restored to a normal level.Trap-Idle-Level-LowDP Scope: Idle level is too low1This trap will occur if the Idle level of a Scope module is too low.Trap-Idle-Level-HighDP Scope: Idle level is too high1This trap will occur if the Idle level of a Scope module is too high.Trap-Idle-Level-RestoredDP Scope: Idle level is restored1This trap will occur if the Idle level of a Scope module is restored to a normal level.";

//-----------

function InitializeJavascript()
{
  UpdateTrapTable(SavableItems);
}

//-----------

function UpdateTrapTable(TrapInfo)
{
  var TableObj = document.getElementById("EnabledTraps");
  if (TableObj == null) return;

  var TrapInfoArray = TrapInfo.split("\x1E");

	var TableRowCount = (TrapInfoArray.length + 1);

  while (TableObj.rows.length < TableRowCount){
  	// too little rows for content: add rows to end of table
  	AddRow(TableObj,1, new Array("Left","Center"));
  }

  while (TableObj.rows.length > TableRowCount){
  	// too much rows for content: remove rows from end of table
  	RemoveRow(TableObj,1);
  }

	for(var i=0; i<TrapInfoArray.length; i++){
		FillTrapRow(i,TrapInfoArray[i]);
	}
}

//-----------

function FillTrapRow(RowNr, DelimitedContext)
{
  var Context = [];
  Context = DelimitedContext.split("\x1F");
  if (Context.length >= 4){
    // item
    var CellContent = Context[1];
    if (Context[3].length > 0){
    	CellContent = AddToolTip("<div>"+CellContent+"</div>",Context[3],"snmpTrapStyle");
    }
    FillTrapCell(RowNr, 0, CellContent);	// user friendly name
    var CheckBoxHtml = sprintf("<input type=\"checkbox\" id=\"checkbox_%s\" %s>",Context[0],GetConditionalText(parseInt(Context[2]),"checked",""));	
    FillTrapCell(RowNr, 1, CheckBoxHtml); // checkedbox containing setting-id and setting-value
  }
  else {
    // caption
    FillTrapCell(RowNr, 0, "<a class=\"menu_head\"><strong>"+Context[0]+"</strong></a>");	// only a user friendly name
    FillTrapCell(RowNr, 1, "");
  }
}

//-----------

function FillTrapCell(RowNr, CellNr, Context)
{
	var CellId = "row" + (RowNr+1) + "_" + (CellNr);
	SetInnerHtmlValue(CellId,Context);
}

//-----------

function SaveClick()
{
  var args = [];
  
  var SnmpCommunity = GetTextValue("snmp_community","");
  args.push("setting_Snmp-ReadCommunity:" + encodeURIComponent(SnmpCommunity));

	if (CheckString(SnmpCommunity,30) != 0){
    alert("Error: The SNMP community string can not be longer than 30 characters.");
    return -1;
  }

  var TrapRecipients = GetTextValue("trap_recipients","");
  args.push("setting_Trap-Recipients:" + encodeURIComponent(TrapRecipients));

  var TrapCommunity = GetTextValue("trap_community","");
  args.push("setting_Trap-Community:" + encodeURIComponent(TrapCommunity));

	if (CheckString(TrapCommunity,30) != 0){
    alert("Error: The SNMP trap community string can not be longer than 30 characters.");
    return -1;
  }

  var TrapPort = GetTextValue("trap_port","");
  args.push("setting_Trap-Port:" + encodeURIComponent(TrapPort));
  
  if (CheckNumber(TrapPort,1,65535) != 0){
    alert("Error: The SNMP Trap PORT must be a value between 1 and 65535.");
    return -1;
  }  
  
  var TrapInfoArray = SavableItems.split("\x1E");
  for(var i=0; i<TrapInfoArray.length; i++){
    var TrapInfoItem = TrapInfoArray[i].split("\x1F");
    if (TrapInfoItem.length > 2){
      var CheckBoxId = "checkbox_"+ TrapInfoItem[0];
      var OldValue = parseInt(TrapInfoItem[2]);
      var CheckBoxValue = parseInt(GetCheckBoxValue(CheckBoxId,OldValue));  
      if (CheckBoxValue != OldValue){
        args.push("setting_"+TrapInfoItem[0]+":" + encodeURIComponent(CheckBoxValue));
      }
    }
  }

  var Result = SaveSegmentedSettingsCombined("data_srv.cgi",args,"save-settings",1);
  if (Result.Code == 200){
    SavableItems = decodeURIComponent(loadXMLDocSynch("data_srv.cgi","property=SnmpTraps"));
  }
}

//-----------

