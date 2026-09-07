
window.onclick = function(event) 
{
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 


var TimerHandleData = null;

var xmlhttpStatusData = null;
var StatusDataTimeout = 0;

var xmlhttpActions = null;

//-----------

function onTimeoutData()
{
  StatusDataTimeout = 0;
  xmlhttpStatusData.onreadystatechange = function() {}
  xmlhttpStatusData.abort();
}

//-----------

function onStateChangeData()
{
  if (xmlhttpStatusData != null){
    if (xmlhttpStatusData.readyState == 4){
      if (xmlhttpStatusData.status == 200){

        var Response = decodeURIComponent(xmlhttpStatusData.responseText);

        var ControlVars = [];

        ControlVars = Response.split("\x1D");

        var CurrentLicenseText = "";
        var CurrentLicenseCode = "";

        if (ControlVars.length >= 2){
          CurrentLicenseText = ControlVars[0];
          CurrentLicenseCode = ControlVars[1];
        }

        UpdateCurrentLicenseTable(CurrentLicenseText,CurrentLicenseCode);

        onTimeoutData();
      }
    }
  }
}

//-----------

function UpdateCurrentLicenseTable(CurrentLicenseText,CurrentLicenseCode)
{
  var TableObj = document.getElementById("CurrentLicense");
  if (TableObj == null) return;

  var LicenseTextArray = [];
	LicenseTextArray = CurrentLicenseText.split("\x1E");

	var TableRowCount = (LicenseTextArray.length + 1);

  while (TableObj.rows.length < TableRowCount){
  	// too little rows for content: add rows to end of table
  	AddRow(TableObj,1, new Array("Left","Center"));
  }

  while (TableObj.rows.length > TableRowCount){
  	// too much rows for content: remove rows from end of table
  	RemoveRow(TableObj,1);
  }

	for(var i=0; i<LicenseTextArray.length; i++){
		FillLicenseRow(i,LicenseTextArray[i]);
	}

  FillLicenseCodeRow(CurrentLicenseCode);
}


//-----------

function FillLicenseCodeRow(CurrentLicenseCode)
{
  var CurrentLicenseArray = [];
  for(var i=0; i<3; i++){
    CurrentLicenseArray.push(CurrentLicenseCode.substr(i*64,64));
  }
  var LicenseCode = CurrentLicenseArray.join("<br>");
  SetInnerHtmlValue('LicenseCodeCell',LicenseCode);
}

//-----------

function FillLicenseRow(RowNr, DelimitedContext)
{
  var Context = [];
  Context = DelimitedContext.split("\x1F");
  FillLicenseCell(RowNr, 0, Context[0]);
  FillLicenseCell(RowNr, 1, Context[1]);
}

//-----------

function FillLicenseCell(RowNr, CellNr, Context)
{
	var CellId = "row" + (RowNr+1) + "_" + (CellNr);
	SetInnerHtmlValue(CellId,Context);
}

//-----------

function PeriodicTimerUpdateStatusData()
{
  if (StatusDataTimeout > 0){
    StatusDataTimeout--;
    return;
  }

  if (xmlhttpStatusData != null){
    xmlhttpStatusData.abort();
  }

  var DataParams     = "data=LicenseText+LicenseCode";
  xmlhttpStatusData = loadXMLDocASynch("data_srv.cgi", DataParams, onStateChangeData, onTimeoutData);
  StatusDataTimeout = 10;
}

//-----------

function InitializeJavascript()
{
  StatusDataTimeout = 0;

  // start the timer(s)
  PeriodicTimerUpdateStatusData();

  var AutoRefreshInterval = 1 * 1000;
  if (AutoRefreshInterval < 1000) AutoRefreshInterval = 1000;
  TimerHandleData = setInterval('PeriodicTimerUpdateStatusData()',AutoRefreshInterval);

  ParseSelectedLicenseFile();
}

//-----------

function onTimeoutActions()
{
  xmlhttpActions.onreadystatechange = function() {}
  xmlhttpActions.abort();
}

//-----------

function onStateChangeActions()
{
  if (xmlhttpActions != null){
    if (xmlhttpActions.readyState == 4){
      if (xmlhttpActions.status == 200){

        var Response = decodeURIComponent(xmlhttpActions.responseText);

        var Result_arr = [];
        Result_arr = Response.split('\x1F');
        if (Result_arr.length == 2){
  	      alert(Result_arr[1]);
        }

        onTimeoutActions();
      }
    }
  }
}

//-----------

function SaveLicenseClick()
{
  if (ParseSelectedLicenseFile() != true){
    alert("유효하지 않은 라이센스 포멧");
    return;
  }

  if (confirm("새로운 라이센스를 적용 하시겠습니까?") != 0){
    var DataParams = "save=data_licenseCode:"+GetEnteredLicenseValue();
    xmlhttpActions = loadXMLDocASynch("data_srv.cgi", DataParams, onStateChangeActions, onTimeoutActions);
  }
}

//-----------

function CheckLicenseFile(content)
{
  var LicensePattern = /^[A-Fa-f0-9]{168}$/;
  var LicenseArray = [];
  LicenseArray = content.match(LicensePattern);

  if (LicenseArray == null) return -1;
  return 0;
}

//-----------

function GetEnteredLicenseValue()
{
  var LicenseContents = GetTextValue("license_area","");
  // remove enters
  LicenseContents = LicenseContents.replace(/\n/gi, "");
  LicenseContents = LicenseContents.replace(/\r/gi, "");

  return LicenseContents;
}

//-----------

function ParseSelectedLicenseFile()
{
  var LicenseContents = GetEnteredLicenseValue();
  return (CheckLicenseFile(LicenseContents) == 0);
}

//-----------

function DownloadLicenseClick()
{
  xmlhttpActions = loadXMLDocASynch("data_srv.cgi", "action=download-license", onStateChangeActions, onTimeoutActions);
}

//-----------

