
window.onclick = function(event) 
{
	CheckMaintenanceEnableModalOnclick(event);
	CheckMaintenanceDisableModalOnclick(event);
} 

function InitializeJavascript()
{
  InitializeJavascriptUserAccess();
  InitializeJavascriptUserMessage();
}

//--------------user access functions---------------------------

var xmlhttpFetchSalt = null;
var xmlhttpSavePassword = null;

var SavableItems = "HomeUAC-channel-listHome1OverviewUAC-livelist실시간상태**1UAC-statistic이벤트발생 통계**1UAC-main-statusComBricks status1UAC-view-diag-hubsProfiHub diagnostics1UAC-ff-livelistFF Live list1Messages &amp; LogsUAC-message-rec메시지 기록내용**1UAC-log-network네트워크 이벤트 기록**1UAC-log-system시스템 기록1Electrical signalsUAC-scope-images오실로스코프 파형**1UAC-scope-bargraph바그래프1UAC-pa-measurementsPA/FF measurements1ConfigurationUAC-config-notifyAlarms1UAC-config-device장치 관리1UAC-config-emailE-mail account1UAC-config-foFiber optic1UAC-config-generalGeneral1UAC-config-licenseLicenses1UAC-config-clustersNetworks1UAC-config-scopeOscilloscope1UAC-config-passwordPassword &amp; users1UAC-config-snmpSNMP1UAC-config-tagTag names1다운로드UAC-downloads다운로드1";

//-----------

function InitializeJavascriptUserAccess()
{
  UpdateCurrentMenuTable(SavableItems);
}

//-----------

function SaveUserPassword()
{
	var currentAdminPass = document.getElementById('pass_user_current').value;
  var newPass = document.getElementById('pass_user1').value;
  var repeatPass = document.getElementById('pass_user2').value;

  SavePassword("User", currentAdminPass, newPass, repeatPass);
}

//-----------

function SaveAdminPassword()
{
	var currentAdminPass = document.getElementById('pass_admin_current').value;
  var newPass = document.getElementById('pass_admin1').value;
  var repeatPass = document.getElementById('pass_admin2').value;

  SavePassword("Admin", currentAdminPass, newPass, repeatPass);  
}

//-----------

function onTimeoutSavePassword()
{
  xmlhttpSavePassword.onreadystatechange = function() {}
  xmlhttpSavePassword.abort();
}

//-----------

function onStateChangeSavePassword()
{
  if (xmlhttpSavePassword != null){
    if (xmlhttpSavePassword.readyState == 4){
      if (xmlhttpSavePassword.status == 200){
  
        var response = decodeURIComponent(xmlhttpSavePassword.responseText);
        
        responseItems = response.split("\x1F");
        alert(responseItems[1]);
        
        onTimeoutSavePassword();
      }
    }
  }
}

//-----------

var currentUser = "xxxxxxxxxxxxxxxx";
var currentPassword = "xxxxxxxxxxxxxxxx";
var newPassword = "xxxxxxxxxxxxxxxx";

//-----------

function onTimeoutFetchSalt()
{
  xmlhttpFetchSalt.onreadystatechange = function() {}
  xmlhttpFetchSalt.abort();

	currentUser = "xxxxxxxxxxxxxxxx";
	currentPassword = "xxxxxxxxxxxxxxxx";
	newPassword = "xxxxxxxxxxxxxxxx";
}

//-----------

function onStateChangeFetchSalt()
{
  if (xmlhttpFetchSalt != null){
    if (xmlhttpFetchSalt.readyState == 4){
      if (xmlhttpFetchSalt.status == 200){
  
        var responseSalts = decodeURIComponent(xmlhttpFetchSalt.responseText).split("\x1D");

			  var hashedCurrentPassword = HashPassword(currentPassword, responseSalts[0]);
			  var hashedNewPassword     = HashPassword(newPassword    , responseSalts[1]);

  			xmlhttpSavePassword = loadXMLDocASynch("data_srv.cgi","action=SavePassword:"+currentUser+":"+hashedNewPassword+":"+responseSalts[1]+":"+hashedCurrentPassword, onStateChangeSavePassword, onTimeoutSavePassword);
        onTimeoutFetchSalt();
      }
    }
  }
}

//-----------

function SavePassword(userName, currentAdminPassword, password1, password2)
{
  if (password1 != password2){
    alert(sprintf("에러: 입력하신 %s 암호는 동일하지 않습니다.",userName.toUpperCase() ) );
    return;
  }

  if (CheckString(password1,16,/^[A-Za-z0-9]{0,16}$/) != 0){
    alert(sprintf("에러: 암호 %s는 16문자를 초과할 수 없으며, 영숫자만을 포함하여야 합니다.",userName.toUpperCase() ) );
    return;
  }

  if (password1.length == 0){
    if (confirm(sprintf("%s의 패스워드를 지우시겠습니까?", userName.toUpperCase() ) ) == false){
      return;
    }
  }
  
  currentUser = userName;
  currentPassword = currentAdminPassword;
  newPassword = password1;
  
  xmlhttpFetchSalt = loadXMLDocASynch("data_srv.cgi","data=AdminSalt+RandomSalt", onStateChangeFetchSalt, onTimeoutFetchSalt);
}

//-----------

function UpdateCurrentMenuTable(MenuInfo)
{
  var TableObj = document.getElementById("MenuAccessConfig");
  if (TableObj == null) return;

  var MenuInfoArray = MenuInfo.split("\x1E");

	var TableRowCount = (MenuInfoArray.length + 1);

  while (TableObj.rows.length < TableRowCount){
  	// too little rows for content: add rows to end of table
  	AddRow(TableObj,1, new Array("Left","Center"));
  }

  while (TableObj.rows.length > TableRowCount){
  	// too much rows for content: remove rows from end of table
  	RemoveRow(TableObj,1);
  }

	for(var i=0; i<MenuInfoArray.length; i++){
		FillMenuInfoRow(i,MenuInfoArray[i]);
	}
}

//-----------

function FillMenuInfoRow(RowNr, DelimitedContext)
{
  var Context = [];
  Context = DelimitedContext.split("\x1F");
  if (Context.length > 2){
    // item
    FillMenuInfoCell(RowNr, 0, Context[1]);
    var CheckBoxHtml = sprintf("<input type=\"checkbox\" id=\"checkbox_%s\" %s>",Context[0],GetConditionalText(parseInt(Context[2]),"checked",""));
    FillMenuInfoCell(RowNr, 1, CheckBoxHtml);
  }
  else {
    // caption
    FillMenuInfoCell(RowNr, 0, "<a class=\"menu_head\"><strong>"+Context[0]+"</strong></a>");
    FillMenuInfoCell(RowNr, 1, "");
  }
}

//-----------

function FillMenuInfoCell(RowNr, CellNr, Context)
{
	var CellId = "row" + (RowNr+1) + "_" + (CellNr);
	SetInnerHtmlValue(CellId,Context);
}

//-----------

function SaveUserAccessClick()
{
  var args = [];
  
  var HideItemsValue = GetCheckBoxValue("user_access_hide_items",0);
  args.push("setting_HideBlockedItems:" + encodeURIComponent(HideItemsValue));
  
  var MenuInfoArray = SavableItems.split("\x1E");
  for(var i=0; i<MenuInfoArray.length; i++){
    var MenuInfoItem = MenuInfoArray[i].split("\x1F");
    if (MenuInfoItem.length > 2){
      var CheckBoxId = "checkbox_"+ MenuInfoItem[0];
      var OldValue = parseInt(MenuInfoItem[2]);
      var CheckBoxValue = parseInt(GetCheckBoxValue(CheckBoxId,OldValue));  
      if (CheckBoxValue != OldValue){
        //alert("changed setting: "+MenuInfoItem[0]+" from "+OldValue+" to "+CheckBoxValue);
        args.push("setting_"+MenuInfoItem[0]+":" + encodeURIComponent(CheckBoxValue));
      }
    }
  }

  var Result = SaveSegmentedSettingsCombined("data_srv.cgi",args,"save-settings",1);
  if (Result.Code == 200){
    SavableItems = decodeURIComponent(loadXMLDocSynch("data_srv.cgi","property=MenuItems"));
  }
}

//-----------usermessage functions--------------------------



var MaxCharacters = 1000;
var MaxCharsPerPart = 192;

//-----------

function LimitText()
{
  var MsgObj = document.getElementById("message_area");
  if (MsgObj == null) return;

  var CurrentLength = TextLengthInBytes(MsgObj.value);
  while(CurrentLength > MaxCharacters){
    MsgObj.value = MsgObj.value.substring(0,MsgObj.value.length-1);
    CurrentLength = TextLengthInBytes(MsgObj.value);
  }
  
  SetInnerHtmlValue("charactersleft","남은 글자수: " + (MaxCharacters - CurrentLength));
}

//-----------

function GetUserMessage()
{
  var GivenUserName = GetSelectBoxValue('login_user',"");
  var GivenPassWord = GetTextValue('login_pass',"");

  // check user/pass with combricks
  var Result = loadXMLDocSynch("data_srv.cgi","data=UserMessage");
  return DecodeHtml(decodeURIComponent(Result));
}

//-----------

function InitializeJavascriptUserMessage()
{
  var MessageObj = document.getElementById("message_area");
  if (MessageObj != null){
    MessageObj.value = GetUserMessage();
  }

  LimitText();
}

//-----------

function GetEncodedStringPart(OriginalString, PartLength)
{
  var SubString = OriginalString.substr(0,PartLength);
  while(SubString.lastIndexOf('%') > (PartLength-3)){ // line must end with complete %xx character or regular character
    PartLength--;
    SubString = SubString.substr(0,PartLength);
  }
  return SubString;
}

//-----------

function SaveUserMessage()
{
  var MessageObj = document.getElementById('message_area');
  if (MessageObj == null) return;

  var UserMessage = MessageObj.value;
  if (CheckString(UserMessage,MaxCharacters) != 0){
    alert("에러: 사용자 메시지는 1000 문자를 초과할 수 없습니다.");
    return;
  }

  var MessageArray = [];
  var EncodedMessage = encodeURIComponent(UserMessage);

  while(EncodedMessage.length > 0){
    var SubString = GetEncodedStringPart(EncodedMessage,MaxCharsPerPart);
    EncodedMessage = EncodedMessage.substr(SubString.length);
    MessageArray.push(SubString);
  }

  if (MessageArray.length == 0){
    MessageArray.push("");
  }

  var Response = "500\x1F브라우저 에러";

  for(var i=0; i<MessageArray.length; i++){
    var DataParams = "save=data_UserMessage:" + i + ":" + MessageArray[i];
    Response = decodeURIComponent(loadXMLDocSynch("data_srv.cgi", DataParams));
  }

  var Result = [];
  Result = Response.split("\x1F");
  if (Result.length > 1){
    alert(Result[1]);
  }
  else {
    alert(Response);
  }
}

//-----------



