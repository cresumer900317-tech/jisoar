
window.onclick = function(event) 
{
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

var TimerHandleData = null;

var xmlhttpStatusData = null;
var StatusDataTimeout = 0;

//-----------

function EnumerateDebugVars()
{
  var Result = [];

  Result.push("TimerHandleData="+TimerHandleData);
  Result.push("xmlhttpStatusData="+xmlhttpStatusData);
  Result.push("StatusDataTimeout="+StatusDataTimeout);
  
  return Result.join("<br>");
}

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
        
        var SectionVars = [];

        var ModuleVars = [];       
        var MainModuleVars = [];
        var ConnectedClients = [];

        SectionVars = Response.split("\x1d");
        if (SectionVars.length >= 3){
          ModuleVars     = SectionVars[0].split("\x1E");
          MainModuleVars = SectionVars[1].split("\x1F");
          ConnectedClients = SectionVars[2].split("\x1E");
        }
                        
        FillModuleTable(ModuleVars,MainModuleVars);
        FillClientTable(ConnectedClients);
        onTimeoutData();
      }
    }
  }
}

//-----------

function FillModuleTable(ModuleInfo, MainModuleInfo)
{
  var TableObj = document.getElementById("ModuleList");
  if (TableObj == null) return;

  var ContentRowCount = 0;
  
	for(var i=0; i<ModuleInfo.length; i++){
		var TempArr = [];
		TempArr = ModuleInfo[i].split("\x1F");
		if (TempArr.length > 1){
			ContentRowCount = (i+1);
		}
		if (TempArr.length == 1){
		  var Code = parseInt(TempArr[0]);
		  if (Code != 100){
		    ContentRowCount = (i+1);
		  }
		}
	}
	
	if (ContentRowCount < 1) ContentRowCount = 1;
	var TableRowCount = (ContentRowCount + 2); // header + mainmodule row always there
	
  
  while (TableObj.rows.length < TableRowCount){
  	// too little rows for content: add rows to end of table
  	AddRow(TableObj,1 , new Array("Center","Center","Left","Left","Center","Center"));
  }

  while (TableObj.rows.length > TableRowCount){
  	// too much rows for content: remove rows from end of table
  	RemoveRow(TableObj,1);
  }

  FillMainModuleRow(0,MainModuleInfo);
	for(var i=0; i<ContentRowCount; i++){
		FillModuleRow(i+1,ModuleInfo[i]);
	}
}

//-----------

function FillMainModuleRow(RowNr,MainModuleInfo)
{
  var ErrorBits = 0;  

  var ModStatus = "빈공간";
  var VendorName  = "";
  var ModuleName  = "";
  var SerialNumber= "";
  var HardwareRev = "";
  
  if (MainModuleInfo.length < 7){
	  ModStatus = DelimitedContext;
	  ErrorBits |= 0x00000001;
  }
  else {
    ModStatus = "OK";
    var SystemError = parseInt(MainModuleInfo[0],10);
    var IoError = parseInt(MainModuleInfo[1],10);
    if ((SystemError != 0) || (IoError != 0)){
      var MainModErrorInText = GetMainModErrorInText(SystemError,IoError,"알수없는 에러",true);
      ModStatus = AddToolTip("<img src='error.gif' class='ImgIcon'>",MainModErrorInText,"systemStatusStyle");
    }
    VendorName  = MainModuleInfo[3];
    ModuleName  = GenerateNavigateLink("inf_head.htm",MainModuleInfo[2]);
    
    if (MainModuleInfo[7].length > 0){
      ModuleName = ModuleName + "<br>" + MainModuleInfo[7];
    }

    SerialNumber= MainModuleInfo[4];
    HardwareRev = MainModuleInfo[5];
  }
  
  var CellData = new Array(ModStatus,ModuleName,VendorName,SerialNumber,HardwareRev);
  for(var i=0; i<CellData.length; i++){
    FillModuleCell(RowNr, i, CellData[i]);
  }
  
}

//-----------

function FillModuleRow(RowNr, DelimitedContext)
{
  var Context = [];
  Context = DelimitedContext.split("\x1F");
  
  var ErrorBits = 0;
  
  var ModStatus = "";
  var VendorName  = "";
  var ModuleName  = "";
  var SerialNumber= "";
  var HardwareRev = "";
  
  if (Context.length < 8){
    // no info: must be empty slot, or errorous
	  ModStatus = GetTextForModuleStatus(DelimitedContext);
	  ErrorBits |= 0x00000001;
	}
	else {
    // got info: fill the vars to display the data
    VendorName  = Context[2];
    ModuleName  = CreateSpecialLinkForModule(parseInt(Context[1]),parseInt(Context[3]),(RowNr-1),Context[4]);
    
    if (Context[10].length > 0){
      ModuleName = ModuleName + "<br>" + Context[10];
    }
    
    SerialNumber= TextToSize(Context[7],6,'0');
    HardwareRev = Context[5];
    
    var ModuleError = parseInt(Context[8],16);
    if (ModuleError != 0){
      ModStatus = AddToolTip("<img src='error.gif' class='ImgIcon'>","<div class='ErrorText'>"+SubModErrorInText(ModuleError)+"</div>","systemStatusStyle");
  	  ErrorBits |= 0x00000002;
    }
  }
 
  if (ErrorBits == 0) ModStatus = "OK";
  
  var CellData = new Array(ModStatus,ModuleName,VendorName,SerialNumber,HardwareRev);
  FillModuleCell(RowNr, -1, RowNr); // Addrow2() - > addrow1?
  for(var i=0; i<CellData.length; i++){
    FillModuleCell(RowNr, i, CellData[i]);
  }
  
}

//-----------

function FillModuleCell(RowNr, CellNr, Context)
{
	var CellId = "row" + (RowNr+1) + "_" + (CellNr+1);
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

  var DataParams     = "data=ModuleInfo+MainModuleInfo+ConnectedClients";
  xmlhttpStatusData = loadXMLDocASynch("data_srv.cgi", DataParams, onStateChangeData, onTimeoutData);
  
  StatusDataTimeout = 10;
}

//-----------

function GetUserMessage()
{
  // check user/pass with combricks
  var Result = loadXMLDocSynch("data_srv.cgi","data=UserMessage");
  Result = nl2br(Result);
  return decodeURIComponent(Result);
}

//-----------

function InitializeJavascript()
{
  // start the timer(s)
  PeriodicTimerUpdateStatusData();
  
  var AutoRefreshInterval = 1 * 1000;
  if (AutoRefreshInterval < 1000) AutoRefreshInterval = 1000;
  TimerHandleData = setInterval('PeriodicTimerUpdateStatusData()',AutoRefreshInterval);
  
  var UserMessage = GetUserMessage();
  
  if (UserMessage.length > 0){
    // set the message to the control
    SetInnerHtmlValue("UserMessageDiv",UserMessage);
  }
  else {
    // hide the table
    SetVisibility("UserMessage",false);
  }
}

//-----------

function SortFunction(a, b)
{
  if (a[0] == b[0]){
    return parseInt(a[1]) - parseInt(b[1]);
  }
  
  var a_arr = a[0].split(".");
  var b_arr = b[0].split(".");
  
  for(var i=0; i<a_arr.length; i++){
    var Result = a_arr[i] - b_arr[i];
    if (Result != 0) return Result;
  }
  return 0;
}

//-----------

function GroupClients(ClientArray)
{
  var GroupedClients = [];
  
  for(var i=0; i<ClientArray.length; i++){
    var ExistingIndex = -1;
    for(var j=0; j<GroupedClients.length; j++){
      if (GroupedClients[j] == ClientArray[i]){
        ExistingIndex = j;
        break;
      }
    }
    if (ExistingIndex < 0){
      GroupedClients.push(ClientArray[i]);
    }
  }
  
  for(var i=0; i<GroupedClients.length; i++){
    GroupedClients[i] = GroupedClients[i].split("\x1f");
  }
  GroupedClients.sort(SortFunction);
  return GroupedClients;
}

//-----------

function FillClientTable(ClientArray)
{
  var TableObj = document.getElementById("ClientList");
  if (TableObj == null) return;

  ClientArray = GroupClients(ClientArray);

  var ContentRowCount = ClientArray.length;
  
	if (ContentRowCount < 1) ContentRowCount = 1;
	var TableRowCount = (ContentRowCount + 1); // header row always there
	
  while (TableObj.rows.length < TableRowCount){
  	// too little rows for content: add rows to end of table
  	AddRow(TableObj,1 , new Array("Left","Center"), "client");
  }

  while (TableObj.rows.length > TableRowCount){
  	// too much rows for content: remove rows from end of table
  	RemoveRow(TableObj,1);
  }

	for(var i=0; i<ContentRowCount; i++){
		FillClientRow(i+1,ClientArray[i]);
	}
}

//-----------

var Services = [
    [ 20                                        , "FTP-DATA"            ],
    [ 21       , "FTP"                 ],
    [ 23    , "텔넷"              ],
    [ 80      , "웹"                 ],
    [ 38888 , "스트리밍"           ],
    [ 38890   , "FDL CONTROLLER/COMM-DTM" ],
    [ 38891    , "REMOTE UPDATE"       ]
  ];

function PortToService(PortNr)
{
  for(var i=0; i<Services.length; i++){
    if (Services[i][0] == PortNr){
      return Services[i][1] + sprintf(" (포트 %s)",PortNr);
    }
  }
  return PortNr;
}

//-----------

function FillClientRow(RowNr, DelimitedContext)
{
  FillClientCell(RowNr, 0, DelimitedContext[0]);
  FillClientCell(RowNr, 1, PortToService(DelimitedContext[1]));
}

//-----------

function FillClientCell(RowNr, CellNr, Context)
{
	var CellId = "client" + (RowNr) + "_" + (CellNr);
	SetInnerHtmlValue(CellId,Context);
}

//-----------
