//using System;
//using System.Collections.Generic;
//using System.ComponentModel;
//using System.Drawing;
//using System.Text;
//using System.Windows.Forms;
//using System.IO;
//using System.Threading;
//using System.Runtime.InteropServices;
//using System.Drawing.Imaging;
//using APILib;

//namespace SmartSEM_API_Test
//{
//    /// <summary>
//    /// Summary description for FrmSmartsemApiTestDialog.
//    /// </summary>
//    public partial class FrmSmartsemApiTestDialog : System.Windows.Forms.Form
//    {
//        //Declare CZ EM API object
//        Api CZEMApi = new Api();


//        private bool m_bInitialised = false;

//        //---------------------Memory map access
//        const UInt32 SECTION_MAP_READ = 0x0004;

//        [DllImport("kernel32.dll", SetLastError = true)]
//        static extern IntPtr OpenFileMapping(uint dwDesiredAccess,
//                                            bool bInheritHandle,
//                                            string lpName);

//        [DllImport("kernel32.dll", SetLastError = true)]
//        static extern IntPtr MapViewOfFile(IntPtr hFileMappingObject,
//                                          uint dwDesiredAccess,
//                                          uint dwFileOffsetHigh,
//                                          uint dwFileOffsetLow,
//                                          uint dwNumberOfBytesToMap);

//        [DllImport("Kernel32.dll")]
//        static extern bool UnmapViewOfFile(IntPtr map);

//        [DllImport("kernel32.dll")]
//        static extern int CloseHandle(IntPtr hObject);
//        //---------------------Memory map access end

//        public FrmSmartsemApiTestDialog()
//        {
//            InitializeComponent();

//            //Set default values
//            txtEditInit.Text = "Not Initialised";
//            txtEditNotify.Text = "No Notification";
//            txtEditInit.BackColor = Color.Red;
//            txtEditNotify.BackColor = Color.Red;
//            cmbReduction.SelectedIndex = 0;

//            // Fill combobox data
//            FillCommandListData();
//            FillParamsListData();

//            //Calling Notification for updated status
//            CZEMApi.Notify += new _EMApiEvents_NotifyEventHandler(CZEMApi_Notify);
//            CZEMApi.NotifyWithCurrentValue += new _EMApiEvents_NotifyWithCurrentValueEventHandler(CZEMApi_NotifyWithCurrentValue);
//        }

//        // Fill Combobox data for Command from the text file
//        public void FillCommandListData()
//        {
//            if (File.Exists("CommandsList.txt"))
//            {
//                try
//                {
//                    using (StreamReader srList = new StreamReader("CommandsList.txt"))
//                    {
//                        string line;
//                        while ((line = srList.ReadLine()) != null)
//                        {
//                            cmbSelectCmd.Items.Add(line);
//                        }
//                    }
//                }
//                catch (Exception ex)
//                {
//                    MessageBox.Show("Error : " + ex.Message, "SmartSEM API Test");
//                    return;
//                }
//            }
//        }

//        // Fill Combobox data for Parameters from the text file
//        public void FillParamsListData()
//        {
//            if (File.Exists("ParamsList.txt"))
//            {
//                try
//                {
//                    using (StreamReader srList = new StreamReader("ParamsList.txt"))
//                    {
//                        string line;
//                        while ((line = srList.ReadLine()) != null)
//                        {
//                            cmbSelectParams.Items.Add(line);
//                        }
//                    }
//                }
//                catch (Exception ex)
//                {
//                    MessageBox.Show("Error : " + ex.Message, "SmartSEM API Test");
//                    return;
//                }
//            }
//        }

//        private void btnCancel_Click(object sender, EventArgs e)
//        {
//            if (m_bInitialised)
//            {// If it has been initilaised close the control
//                CZEMApi.ClosingControl();
//            }
//            this.Close();
//        }

//        private void btnOK_Click(object sender, EventArgs e)
//        {
//            if (m_bInitialised)
//            {// If it has been initilaised call close the control
//                CZEMApi.ClosingControl();

//                //save the Commands list to the txt file
//                using (StreamWriter srList = new StreamWriter("CommandsList.txt"))
//                {
//                    for (int x = 0; x < cmbSelectCmd.Items.Count; x++)
//                    {
//                        srList.WriteLine(cmbSelectCmd.Items[x].ToString());
//                    }
//                }
//                //save the Params list to the txt file
//                using (StreamWriter srList = new StreamWriter("ParamsList.txt"))
//                {
//                    for (int x = 0; x < cmbSelectParams.Items.Count; x++)
//                    {
//                        srList.WriteLine(cmbSelectParams.Items[x].ToString());
//                    }
//                }
//            }
//            this.Close();
//        }

//        private void btnInitialiseCZEMApi_Click(object sender, EventArgs e)
//        {
//            txtEditInit.Text = "Trying to initialise, please wait...";
//            txtEditInit.Update();

//            long lReturn = CZEMApi.Initialise("");
//            if (lReturn == 0)
//            {
//                m_bInitialised = true;
//                txtEditInit.Text = "Initialised";
//                txtEditInit.BackColor = Control.DefaultBackColor;
//                btnInitialiseRemoteCZEMApi.Enabled = false;// Disable remote functionality
//                btnStartServer.Enabled = false;
//                txtEditUserName.Enabled = false;
//                txtEditPassword.Enabled = false;
//                btnLogon.Enabled = false;
//                btnGetRemotingError.Enabled = false;
//                btnGetUserName.Enabled = false;
//                btnGetUserIdle.Enabled = false;
//            }
//            else
//            {
//                txtEditInit.Text = "Not Initialised";
//                txtEditInit.BackColor = Color.Red;
//                ReportError(lReturn, "Initialise", "Initialise COM");
//            }
//        }

//        private void btnInitialiseRemoteCZEMApi_Click(object sender, EventArgs e)
//        {
//            txtEditInit.Text = "Trying to initialise, please wait...";
//            txtEditInit.Update();

//            long lReturn = CZEMApi.InitialiseRemoting();
//            if (lReturn == 0)
//            {
//                m_bInitialised = true;
//                txtEditInit.Text = "Initialised Remote";
//                txtEditInit.BackColor = Control.DefaultBackColor;
//                btnInitialiseCZEMApi.Enabled = false;// Disable non-remote functionallity
//                btnGrabMMF.Enabled = false;
//                btnFreeMMF.Enabled = false;
//            }
//            else
//            {
//                txtEditInit.Text = "Not Initialised";
//                txtEditInit.BackColor = Color.Red;
//                ReportError(lReturn, "Initialise Remoting", "Initialise COM");
//            }
//        }

//        private void btnStartServer_Click(object sender, EventArgs e)
//        {
//            long lReturn = CZEMApi.StartEMServer();
//            if (lReturn != 0)
//            {
//                ReportError(lReturn, "Start Server", "Start Server");
//            }
//        }

//        private void btnLogon_Click(object sender, EventArgs e)
//        {
//            if (txtEditUserName.Text.Length == 0)
//            {
//                MessageBox.Show(this, "You must enter a User Name!");
//                return;
//            }
//            long lReturn = CZEMApi.LogonToEMServer(txtEditUserName.Text, txtEditPassword.Text);
//            if (lReturn != 0)
//            {
//                ReportError(lReturn, "Logon", "Logon");
//            }
//        }

//        private void btnSetNotify_Click(object sender, EventArgs e)
//        {
//            if (m_bInitialised)
//            {
//                // Vacuum
//                if (CZEMApi.SetNotify("DP_VACSTATUS", 1) != 0)
//                {
//                    DisplayError("SetNotify", "DP_VACSTATUS");
//                    return;
//                }
//                // Gun / EHT state
//                if (CZEMApi.SetNotify("DP_RUNUPSTATE", 1) != 0)
//                {
//                    DisplayError("SetNotify", "DP_RUNUPSTATE");
//                    return;
//                }
//                // actual KV / EHT
//                if (CZEMApi.SetNotify("AP_ACTUALKV", 1) != 0)
//                {
//                    DisplayError("SetNotify", "AP_ACTUALKV");
//                    return;
//                }
//                // actual current
//                if (CZEMApi.SetNotify("AP_ACTUALCURRENT", 1) != 0)
//                {
//                    DisplayError("SetNotify", "AP_ACTUALCURRENT");
//                    return;
//                }
//                // column type
//                if (CZEMApi.SetNotify("DP_COLUMN_TYPE", 1) != 0)
//                {
//                    DisplayError("SetNotify", "DP_COLUMN_TYPE");
//                    return;
//                }
//                // mode
//                if (CZEMApi.SetNotify("DP_OPERATING_MODE", 1) != 0)
//                {
//                    DisplayError("SetNotify", "DP_OPERATING_MODE");
//                    return;
//                }
//                // scan rate
//                if (CZEMApi.SetNotify("DP_SCANRATE", 1) != 0)
//                {
//                    DisplayError("SetNotify", "DP_SCANRATE");
//                    return;
//                }
//                // auto function active
//                if (CZEMApi.SetNotify("DP_AUTO_FUNCTION", 1) != 0)
//                {
//                    DisplayError("SetNotify", "DP_AUTO_FUNCTION");
//                    return;
//                }
//                // Magnification
//                if (CZEMApi.SetNotify("AP_MAG", 1) != 0)
//                {
//                    DisplayError("SetNotify", "AP_MAG");
//                    return;
//                }
//                // Working distance
//                if (CZEMApi.SetNotify("AP_WD", 1) != 0)
//                {
//                    DisplayError("SetNotify", "AP_WD");
//                    return;
//                }
//                // probe current
//                if (CZEMApi.SetNotify("AP_IPROBE", 1) != 0)
//                {
//                    DisplayError("SetNotify", "AP_IPROBE");
//                    return;
//                }
//                // detector
//                if (CZEMApi.SetNotify("DP_DETECTOR_TYPE", 1) != 0)
//                {
//                    DisplayError("SetNotify", "DP_DETECTOR_TYPE");
//                    return;
//                }
//                // stage initialised
//                if (CZEMApi.SetNotify("DP_STAGE_INIT", 1) != 0)
//                {
//                    DisplayError("SetNotify", "DP_STAGE_INIT");
//                    return;
//                }
//                // stage busy?
//                if (CZEMApi.SetNotify("DP_STAGE_IS", 1) != 0)
//                {
//                    DisplayError("SetNotify", "DP_STAGE_IS");
//                    return;
//                }
//                // fib mode
//                if (CZEMApi.SetNotify("DP_FIB_MODE", 1) != 0)
//                {
//                    DisplayError("SetNotify", "DP_FIB_MODE");
//                    return;
//                }
//                // fib gun state
//                if (CZEMApi.SetNotify("DP_FIB_GUN_STATE", 1) != 0)
//                {
//                    DisplayError("SetNotify", "DP_FIB_GUN_STATE");
//                    return;
//                }

//                txtEditNotify.Text = "Notification enabled";
//                txtEditNotify.BackColor = Control.DefaultBackColor;
//            }
//        }

//        public void CZEMApi_Notify(string strParameter, int reason)
//        {
//            Notify(strParameter, reason);
//        }

//        public void CZEMApi_NotifyWithCurrentValue(string strParameter, int reason, int paramid, double dLastKnownValue)
//        {
//            Notify(strParameter, reason);
//        }

//        public void Notify(string strParameter, int reason)
//        {
//            string strGetEMSERVERMsg = "";
//            switch ((ZeissNotificationCode)reason)
//            {
//                case ZeissNotificationCode.PARAMETER_CHANGE: // Parameter Change
//                    if (strParameter == "DP_VACSTATUS" || strParameter == "DP_RUNUPSTATE" || strParameter == "DP_COLUMN_TYPE" || strParameter == "DP_OPERATING_MODE"
//                        || strParameter == "DP_SCANRATE" || strParameter == "DP_AUTO_FUNCTION" || strParameter == "DP_DETECTOR_TYPE" || strParameter == "DP_STAGE_INIT"
//                        || strParameter == "DP_STAGE_IS" || strParameter == "DP_FIB_MODE" || strParameter == "DP_FIB_GUN_STATE" || strParameter == "AP_ACTUALKV"
//                        || strParameter == "AP_ACTUALCURRENT" || strParameter == "AP_MAG" || strParameter == "AP_WD" || strParameter == "AP_IPROBE")
//                    {
//                        UpdateStatus(strParameter);
//                    }
//                    break;

//                case ZeissNotificationCode.REMOTING_SERVER_EXITED:
//                    txtNotifyEdit.Text = txtNotifyEdit.Text + "\r\n" + "Remote Server Exited";
//                    strGetEMSERVERMsg = "Remote Server Exited";
//                    DisplayError("Remote Server closed", "");
//                    m_bInitialised = false;
//                    txtEditInit.Text = "Not Initialised";
//                    txtEditNotify.Text = "No Notification";
//                    txtEditInit.BackColor = Color.Red;
//                    txtEditNotify.BackColor = Color.Red;
//                    break;

//                default:
//                    strGetEMSERVERMsg = strParameter;
//                    break;
//            }

//            if (strGetEMSERVERMsg.Length > 0)
//            {
//                if (txtNotifyEdit.Text.Length > 0)
//                {
//                    txtNotifyEdit.Text += "\r\n" + strGetEMSERVERMsg;
//                    txtNotifyEdit.SelectionStart = txtNotifyEdit.Text.Length;
//                    txtNotifyEdit.SelectionLength = 0;
//                }
//                else
//                {
//                    txtNotifyEdit.Text = strGetEMSERVERMsg;
//                }
//            }
//        }

//        private void btnRefreshParams_Click(object sender, EventArgs e)
//        {
//            if (m_bInitialised)
//            {
//                UpdateStatus("DP_VACSTATUS");
//                UpdateStatus("DP_RUNUPSTATE");
//                UpdateStatus("DP_COLUMN_TYPE");
//                UpdateStatus("DP_OPERATING_MODE");
//                UpdateStatus("DP_SCANRATE");
//                UpdateStatus("DP_AUTO_FUNCTION");
//                UpdateStatus("DP_DETECTOR_TYPE");
//                UpdateStatus("DP_STAGE_INIT");
//                UpdateStatus("DP_STAGE_IS");
//                UpdateStatus("DP_FIB_MODE");
//                UpdateStatus("DP_FIB_GUN_STATE");
//                UpdateStatus("AP_ACTUALKV");
//                UpdateStatus("AP_ACTUALCURRENT");
//                UpdateStatus("AP_MAG");
//                UpdateStatus("AP_WD");
//                UpdateStatus("AP_IPROBE");
//            }
//        }

//        public void UpdateStatus(string szParam)
//        {
//            object varStr = new VariantWrapper("");
//            long lReturn = CZEMApi.Get(szParam, ref varStr);
//            if (lReturn != 0)
//            {
//                ReportError(lReturn, "Update Status", szParam);
//                return;
//            }

//            if (szParam == "DP_VACSTATUS")
//            {
//                txtEditVacStatus.Text = "VAC status = " + varStr;
//            }
//            else if (szParam == "DP_RUNUPSTATE")
//            {
//                txtEditRunupstate.Text = "Beam Status = " + varStr;
//            }
//            else if (szParam == "DP_COLUMN_TYPE")
//            {
//                txtEditColumnType.Text = "Column Type = " + varStr;
//            }
//            else if (szParam == "DP_STAGE_INIT")
//            {
//                txtEditStageInit.Text = "Stage Initialised = " + varStr;
//            }
//            else if (szParam == "DP_STAGE_IS")
//            {
//                txtEditStageIs.Text = "Stage = " + varStr;
//            }
//            else if (szParam == "DP_OPERATING_MODE")
//            {
//                txtEditOperatingMode.Text = "Operating Mode = " + varStr;
//            }
//            else if (szParam == "DP_SCANRATE")
//            {
//                txtEditScanrate.Text = "Scan Rate = " + varStr;
//            }
//            else if (szParam == "DP_AUTO_FUNCTION")
//            {
//                txtEditAutoFunction.Text = "Auto Function = " + varStr;
//            }
//            else if (szParam == "DP_DETECTOR_TYPE")
//            {
//                txtEditDetectorType.Text = "Detector =  " + varStr;
//            }
//            else if (szParam == "DP_FIB_MODE")
//            {
//                txtEditFibMode.Text = "FIB Mode =  " + varStr;
//            }
//            else if (szParam == "DP_FIB_GUN_STATE")
//            {
//                txtEditFibGunState.Text = "FIB Gun =  " + varStr;
//            }
//            else if (szParam == "AP_ACTUALKV")
//            {
//                txtEditActualkv.Text = "EHT " + varStr;
//            }
//            else if (szParam == "AP_ACTUALCURRENT")
//            {
//                txtEditActualcurrent.Text = "I " + varStr;
//            }
//            else if (szParam == "AP_MAG")
//            {
//                txtEditMag.Text = "Mag " + varStr;
//            }
//            else if (szParam == "AP_WD")
//            {
//                txtEditWd.Text = "WD " + varStr;
//            }
//            else if (szParam == "AP_IPROBE")
//            {
//                txtEditIprobe.Text = "Probe I " + varStr;
//            }
//        }

//        private void btnExecuteCommand_Click(object sender, EventArgs e)
//        {
//            if (m_bInitialised)
//            {
//                string strCmd = cmbSelectCmd.Text.ToUpper().Trim(); // get the command ensuring it is uppercase and remove any whitespace chars

//                if ((strCmd.IndexOf("CMD_") == 0
//                    || strCmd.IndexOf("MCF_") == 0
//                    || strCmd.IndexOf("MCL_") == 0))
//                {// check that the command string starts with CMD_, MCF or MCL_
//                    long lResult = CZEMApi.Execute(strCmd);// execute command
//                    if (lResult != 0)
//                    {
//                        ReportError(lResult, "Execute Command", strCmd);
//                        return;
//                    }

//                    if (cmbSelectCmd.FindStringExact(strCmd, 0) == -1)
//                    {// If this command is not already in the list add it so it gets stored for later use)
//                        cmbSelectCmd.Items.Add(strCmd);
//                    }
//                }
//            }
//        }

//        private void btnGetValueParams_Click(object sender, EventArgs e)
//        {
//            if (m_bInitialised)
//            {
//                txtEditValueString.Text = ""; // clear the results
//                txtEditValue.Text = ""; // clear the results

//                string strParam = cmbSelectParams.Text.ToUpper().Trim(); // get the param ensuring it is uppercase and remove any whitespace chars

//                if (strParam.IndexOf("DP_") == 0 || strParam.IndexOf("AP_") == 0)
//                {// check that the parameter string starts with DP_ or AP_
//                    object varfloat = new VariantWrapper((float)0.0f);

//                    // get param (numeric)value 
//                    long lResult = CZEMApi.Get(strParam, ref varfloat);
//                    if (lResult != 0)
//                    {
//                        ReportError(lResult, "Get Value", strParam);
//                        return;
//                    }

//                    if (strParam.IndexOf("DP_") == 0) // digital
//                    {// digital
//                        txtEditValue.Text = Convert.ToDecimal(varfloat).ToString();
//                    }
//                    else
//                    {// analogue
//                        txtEditValue.Text = Convert.ToDouble(varfloat).ToString();
//                    }

//                    object varStr = new VariantWrapper("");
//                    // get param (string)value 
//                    lResult = CZEMApi.Get(strParam, ref varStr);
//                    if (lResult != 0)
//                    {
//                        ReportError(lResult, "Get Value", strParam);
//                        return;
//                    }
//                    txtEditValueString.Text = varStr.ToString();

//                    if (cmbSelectParams.FindStringExact(strParam, 0) == -1)
//                    {// If this param is not already in the list add it so it gets stored for later use)
//                        cmbSelectParams.Items.Add(strParam);
//                    }
//                }
//                else if (strParam.IndexOf("SV_") == 0)
//                {
//                    object varStr = new VariantWrapper("");
//                    // get value as string
//                    long lResult = CZEMApi.Get(strParam, ref varStr);

//                    if (lResult != 0)
//                    {
//                        ReportError(lResult, "Get Value", strParam);
//                        return;
//                    }

//                    txtEditValueString.Text = varStr.ToString();

//                    if (cmbSelectParams.FindStringExact(strParam, 0) == -1)
//                    {// If this param is not already in the list add it so it gets stored for later use)
//                        cmbSelectParams.Items.Add(strParam);
//                    }
//                }
//            }
//        }

//        private void btnSetValueParams_Click(object sender, EventArgs e)
//        {
//            if (m_bInitialised)
//            {
//                string strParam = cmbSelectParams.Text.ToUpper().Trim(); // get the param ensuring it is uppercase and remove any whitespace chars

//                // check that the parameter string starts with DP_ or AP_
//                if (strParam.IndexOf("DP_") == 0 || strParam.IndexOf("AP_") == 0)
//                {
//                    float fValue = 0;
//                    if (float.TryParse(txtEditValue.Text, out fValue))
//                    {
//                        object varFloat = new VariantWrapper(fValue);

//                        long lResult = CZEMApi.Set(strParam, ref varFloat);// set value
//                        if (lResult != 0)
//                        {
//                            ReportError(lResult, "Set Value", strParam);
//                            return;
//                        }
//                        Thread.Sleep(30);

//                        object varStr = new VariantWrapper("");
//                        lResult = CZEMApi.Get(strParam, ref varStr);

//                        if (lResult != 0)
//                        {
//                            ReportError(lResult, "Set Value", strParam);
//                            return;
//                        }

//                        txtEditValueString.Text = varStr.ToString();

//                        if (cmbSelectParams.FindStringExact(strParam, 0) == -1)
//                        {// If this param is not already in the list add it so it gets stored for later use)
//                            cmbSelectParams.Items.Add(strParam);
//                        }
//                    }
//                }
//            }
//        }

//        private void btnGetLimits_Click(object sender, EventArgs e)
//        {
//            if (m_bInitialised)
//            {
//                string strParam = cmbSelectParams.Text.ToUpper().Trim(); // get the param ensuring it is uppercase and remove any whitespace chars

//                // check that the parameter string starts with DP_ or AP_
//                if (strParam.IndexOf("DP_") == 0 || strParam.IndexOf("AP_") == 0)
//                {
//                    object varMin = new VariantWrapper((float)0.0f);
//                    object varMax = new VariantWrapper((float)0.0f);

//                    // get limits
//                    long lResult = CZEMApi.GetLimits(strParam, ref varMin, ref varMax);
//                    if (lResult != 0)
//                    {
//                        ReportError(lResult, "Get Limits", strParam);
//                        return;
//                    }

//                    // get value from VAR
//                    if (strParam.IndexOf("DP_") == 0)
//                    {// digital
//                        txtEditLimitLow.Text = Convert.ToDecimal(varMin).ToString();
//                        txtEditLimitHigh.Text = Convert.ToDecimal(varMax).ToString();
//                    }
//                    else
//                    {// analogue
//                        txtEditLimitLow.Text = Convert.ToDouble(varMin).ToString();
//                        txtEditLimitHigh.Text = Convert.ToDouble(varMax).ToString();
//                    }
//                }

//                if (cmbSelectParams.FindStringExact(strParam, 0) == -1)
//                {// If this param is not already in the list add it so it gets stored for later use)
//                    cmbSelectParams.Items.Add(strParam);
//                }
//            }
//        }

//        private void btnGrabImage2File_Click(object sender, EventArgs e)
//        {
//            if (m_bInitialised)
//            {
//                // You can save as Bitmap or Tiff but not JPeg
//                // Tiff has the Zeiss header with acquisition param info

//                string strFileName = "C:\\Grab.tif";
//                short reduction = 0;
//                short.TryParse(cmbReduction.Text, out reduction);

//                long lResult = CZEMApi.Grab(0, 0, 1024, 768, reduction, strFileName);
//                if (lResult != 0)
//                {
//                    ReportError(lResult, "Grab Image to File", strFileName);
//                    return;
//                }

//                // open the image in the default image editor
//                System.Diagnostics.Process.Start(strFileName);
//            }
//        }

//        private void btnGrabMMF_Click(object sender, EventArgs e)
//        {
//            if (m_bInitialised)
//            {
//                short x = 0;
//                short y = 0;
//                short w = 1024;
//                short h = 768;
//                short reduction = 0;
//                short.TryParse(cmbReduction.Text, out reduction);
//                string strFileName = "CZ.MMF"; // special filename to create a memory mapped file

//                // grab image to MMF		        
//                long lResult = CZEMApi.Grab(x, y, w, h, reduction, strFileName); // Note: reduction is ignored
//                if (lResult != 0)
//                {
//                    ReportError(lResult, "Grab Image to MMF", strFileName);
//                    return;
//                }

//                IntPtr fileHandle = OpenFileMapping(SECTION_MAP_READ, false, strFileName);
//                if (fileHandle == IntPtr.Zero)
//                {
//                    ReportError("OpenFileMapping() Error", "Grab Image to MMF", strFileName);
//                }
//                else
//                {
//                    // Obtain a read/write map for the entire file
//                    IntPtr fileMap = MapViewOfFile(fileHandle, SECTION_MAP_READ, 0, 0, 0);
//                    if (fileMap == IntPtr.Zero)
//                    {
//                        ReportError("MapViewOfFile() Error", "Grab Image to MMF", strFileName);
//                    }
//                    else
//                    {
//                        // for testing: write to a bitmap file and display
//                        string strFilename = "C:\\Grab.bmp";

//                        object varFloat = new VariantWrapper((float)0.0f);
//                        long lResult1 = CZEMApi.Get("DP_IMAGE_STORE", ref varFloat);
//                        if (lResult != 0)
//                        {
//                            ReportError(lResult, "Grab Image to MMF (DP_IMAGE_STORE)", strFileName);
//                        }
//                        else
//                        {
//                            switch (Convert.ToInt32(varFloat))
//                            {
//                                case 0://S_RES_STD:
//                                    break;
//                                case 1://S_RES_HALF:
//                                    w /= 2;
//                                    h /= 2;
//                                    break;
//                                case 2://S_RES_2:
//                                    w *= 2;
//                                    h *= 2;
//                                    break;
//                                case 3://S_RES_3:
//                                    w *= 3;
//                                    h *= 3;
//                                    break;
//                            }
//                            reduction++;
//                            w /= reduction;
//                            h /= reduction;

//                            Bitmap bitmap = new Bitmap(w, h, PixelFormat.Format8bppIndexed); //Create new Bitmap with 8 bit pixels

//                            ColorPalette pal = bitmap.Palette;// set the palete to greyscale
//                            for (int count = 0; count < 256; count++)
//                            {
//                                pal.Entries[count] = Color.FromArgb(count, count, count);
//                            }
//                            bitmap.Palette = pal;

//                            BitmapData bmData = bitmap.LockBits(new Rectangle(0, 0, bitmap.Width, bitmap.Height), ImageLockMode.ReadWrite, PixelFormat.Format8bppIndexed); //Lock the pixels  
//                            int iSize = bitmap.Width * bitmap.Height;
//                            Byte[] FileData = new Byte[iSize * 2];
//                            Marshal.Copy(fileMap, FileData, 0, iSize * 2);// Copy the bytes to ByteArray

//                            Byte[] BmpData = new Byte[iSize];
//                            for (uint i = 0; i < iSize; i++)
//                            {
//                                BmpData[i] = FileData[i * 2 + 1];// copy the most significant bits to convert to 8 bit pixels (causes the image to flip on the y axis due to the byte alignment)
//                            }

//                            Marshal.Copy(BmpData, 0, bmData.Scan0, iSize);// Copy the ByteArray to the bitmap object

//                            bitmap.UnlockBits(bmData);//Unlock the pixels  
//                            bitmap.RotateFlip(RotateFlipType.RotateNoneFlipY);// flip the image back to original orientation
//                            bitmap.Save(strFilename);// Save the bitmap file

//                            // open the image in the default image editor
//                            System.Diagnostics.Process.Start(strFilename);
//                        }

//                        //Clean up
//                        UnmapViewOfFile(fileMap);
//                    }
//                    //Clean up
//                    CloseHandle(fileHandle);
//                }

//            }
//        }

//        private void btnFreeMMF_Click(object sender, EventArgs e)
//        {
//            // Free the shared memory buffer by calling Grab with an Empty rectangle
//            string strFileName = "CZ.MMF";
//            long lResult = CZEMApi.Grab(0, 0, 0, 0, 0, strFileName);
//        }

//        private void btnGetLastError_Click(object sender, EventArgs e)
//        {
//            DisplayError("btnGetLastError_Click", "Get Last Error");
//        }

//        private void btnGetRemotingError_Click(object sender, EventArgs e)
//        {
//            string strError = "";
//            long lReturn = CZEMApi.GetLastRemotingConnectionError(ref strError);
//            if (lReturn == 0)
//            {
//                if (strError == "")
//                {
//                    strError = "No error occured";
//                }
//                ReportError(strError, "btnGetRemotingError_Click", "Get Remoting Error");
//            }
//            else
//            {
//                ReportError(lReturn, "btnGetRemotingError_Click", "Get Remoting Error");
//            }
//        }

//        private void btnGetUserName_Click(object sender, EventArgs e)
//        {
//            string strServerUser = "";
//            string strWinUser = "";
//            long lReturn = CZEMApi.GetCurrentUserName(ref strServerUser, ref strWinUser);
//            if (lReturn == 0)
//            {
//                txtEditError.Text = string.Format("Windows user: {0}\r\nSmartSEM user: {1}\r\n", strWinUser, strServerUser);
//            }
//            else
//            {
//                ReportError(lReturn, "Get User Name", "Get User Name");
//            }
//        }

//        private void btnGetUserIdle_Click(object sender, EventArgs e)
//        {
//            int lVal = 0;
//            long lReturn = CZEMApi.GetUserIsIdle(ref lVal);
//            if (lReturn == 0)
//            {
//                if (lVal == 0)
//                {
//                    txtEditError.Text = string.Format("User not Idle");
//                }
//                else
//                {
//                    txtEditError.Text = string.Format("User is Idle");
//                }
//            }
//            else
//            {
//                ReportError(lReturn, "Get User Name", "Get User Name");
//            }
//        }

//        internal void ReportError(string strError, string strCaller, string strComment)
//        {
//            if (strCaller.Length != 0 || strComment.Length != 0)
//            {
//                txtEditError.Text = string.Format("{0}\r\nCaller: {1}\r\nComment: {2}", strError, strCaller, strComment);
//            }
//            else
//            {
//                txtEditError.Text = strError;
//            }
//        }

//        internal void ReportError(long lReturn, string strCaller, string strComment)
//        {
//            ReportError(ErrorToString(lReturn), strCaller, strComment);
//        }

//        internal void DisplayError(string strCaller, string strComment)
//        {
//            if (m_bInitialised)
//            {
//                object objError = new VariantWrapper("");
//                long lResult = CZEMApi.GetLastError(ref objError);
//                if (lResult == 0)
//                {
//                    if (objError != null)
//                    {
//                        ReportError(objError.ToString(), strCaller, strComment);
//                    }
//                    else
//                    {
//                        ReportError("No error occured", strCaller, strComment);
//                    }
//                }
//                else
//                {
//                    ReportError("Cannot get last error", strCaller, strComment);
//                }
//            }
//        }

//        string ErrorToString(long lError)
//        {
//            string strError;
//            switch ((ZeissErrorCode)lError)
//            {
//                case 0:
//                    strError = "OK";
//                    break;
//                case ZeissErrorCode.API_E_GET_TRANSLATE_FAIL:
//                    strError = "Failed to translate parameter into an ID";
//                    break;
//                case ZeissErrorCode.API_E_GET_AP_FAIL:
//                    strError = "Failed to get analogue value";
//                    break;
//                case ZeissErrorCode.API_E_GET_DP_FAIL:
//                    strError = "Failed to get digital value";
//                    break;
//                case ZeissErrorCode.API_E_GET_BAD_PARAMETER:
//                    strError = "Parameter supplied is neither analogue nor digital";
//                    break;
//                case ZeissErrorCode.API_E_SET_TRANSLATE_FAIL:
//                    strError = "Failed to translate parameter into an ID";
//                    break;
//                case ZeissErrorCode.API_E_SET_STATE_FAIL:
//                    strError = "Failed to set a digital state";
//                    break;
//                case ZeissErrorCode.API_E_SET_FLOAT_FAIL:
//                    strError = "Failed to set a float value";
//                    break;
//                case ZeissErrorCode.API_E_SET_FLOAT_LIMIT_LOW:
//                    strError = "Value supplied is too low";
//                    break;
//                case ZeissErrorCode.API_E_SET_FLOAT_LIMIT_HIGH:
//                    strError = "Value supplied is too high";
//                    break;
//                case ZeissErrorCode.API_E_SET_BAD_VALUE:
//                    strError = "Value supplied is of wrong type";
//                    break;
//                case ZeissErrorCode.API_E_SET_BAD_PARAMETER:
//                    strError = "Parameter supplied is not analogue nor digital";
//                    break;
//                case ZeissErrorCode.API_E_EXEC_TRANSLATE_FAIL:
//                    strError = "Failed to translate command into an ID";
//                    break;
//                case ZeissErrorCode.API_E_EXEC_CMD_FAIL:
//                    strError = "Failed to execute command";
//                    break;
//                case ZeissErrorCode.API_E_EXEC_MCF_FAIL:
//                    strError = "Failed to execute file macro";
//                    break;
//                case ZeissErrorCode.API_E_EXEC_MCL_FAIL:
//                    strError = "Failed to execute library macro";
//                    break;
//                case ZeissErrorCode.API_E_EXEC_BAD_COMMAND:
//                    strError = "Command supplied is not implemented";
//                    break;
//                case ZeissErrorCode.API_E_GRAB_FAIL:
//                    strError = "Grab command failed";
//                    break;
//                case ZeissErrorCode.API_E_GET_STAGE_FAIL:
//                    strError = "Get Stage position failed";
//                    break;
//                case ZeissErrorCode.API_E_MOVE_STAGE_FAIL:
//                    strError = "Move Stage position failed";
//                    break;
//                case ZeissErrorCode.API_E_NOT_INITIALISED:
//                    strError = "API not initialised";
//                    break;
//                case ZeissErrorCode.API_E_NOTIFY_TRANSLATE_FAIL: // 1020L
//                    strError = "Failed to translate parameter to an ID";
//                    break;
//                case ZeissErrorCode.API_E_NOTIFY_SET_FAIL:
//                    strError = "Set notification failed";
//                    break;
//                case ZeissErrorCode.API_E_GET_LIMITS_FAIL:
//                    strError = "Get limits failed";
//                    break;
//                case ZeissErrorCode.API_E_GET_MULTI_FAIL:
//                    strError = "Get multiple parameters failed";
//                    break;
//                case ZeissErrorCode.API_E_SET_MULTI_FAIL:
//                    strError = "Set multiple parameters failed";
//                    break;
//                case ZeissErrorCode.API_E_NOT_LICENSED:
//                    strError = "Missing API license";
//                    break;
//                case ZeissErrorCode.API_E_NOT_IMPLEMENTED:
//                    strError = "Reserved or not implemented";
//                    break;
//                case ZeissErrorCode.API_E_GET_USER_NAME_FAIL:
//                    strError = "Failed to get user name";
//                    break;
//                case ZeissErrorCode.API_E_GET_USER_IDLE_FAIL:
//                    strError = "Failed to get user idle state";
//                    break;
//                case ZeissErrorCode.API_E_GET_LAST_REMOTING_CONNECT_ERROR_FAIL:
//                    strError = "Failed to get the last remoting connection error string";
//                    break;
//                case ZeissErrorCode.API_E_EMSERVER_LOGON_FAILED:
//                    strError = "Failed to remotely logon to the EM Server. Username and password may be incorrect or EM Server is not running or User is already logged on";
//                    break;
//                case ZeissErrorCode.API_E_EMSERVER_START_FAILED:
//                    strError = "Failed to start the EM Server. This may be because the Server is already running or has an internal error.";
//                    break;
//                case ZeissErrorCode.API_E_REMOTING_NOT_CONFIGURED:
//                    strError = "Remoting incorrectly configured, use RConfigure to correct";
//                    break;
//                case ZeissErrorCode.API_E_REMOTING_FAILED_TO_CONNECT:
//                    strError = "Remoting did not connect to the server";
//                    break;
//                case ZeissErrorCode.API_E_REMOTING_COULD_NOT_CREATE_INTERFACE:
//                    strError = "Remoting could not start (unknown reason)";
//                    break;
//                case ZeissErrorCode.API_E_REMOTING_EMSERVER_NOT_RUNNING:
//                    strError = "EMServer is not running on the remote machine";
//                    break;
//                case ZeissErrorCode.API_E_REMOTING_NO_USER_LOGGED_IN:
//                    strError = "No user is logged into EM Server on the remote machine";
//                    break;
//                default:
//                    strError = string.Format("Unknown error code {0}", lError);
//                    break;
//            }
//            return strError;
//        }

//        public enum ZeissErrorCode
//        {
//            // Failed to translate parameter into an id
//            API_E_GET_TRANSLATE_FAIL = 1000,

//            // Failed to get analogue value
//            API_E_GET_AP_FAIL = 1001,

//            // Failed to get digital value
//            API_E_GET_DP_FAIL = 1002,
//            // Parameter supplied is not analogue nor digital
//            API_E_GET_BAD_PARAMETER = 1003,

//            // Failed to translate parameter into an id
//            API_E_SET_TRANSLATE_FAIL = 1004,

//            // Failed to set a digital state 
//            API_E_SET_STATE_FAIL = 1005,

//            // Failed to set a float value
//            API_E_SET_FLOAT_FAIL = 1006,

//            // Value supplied is too low
//            API_E_SET_FLOAT_LIMIT_LOW = 1007,

//            // Value supplied is too high
//            API_E_SET_FLOAT_LIMIT_HIGH = 1008,

//            // Value supplied is is of wrong type
//            API_E_SET_BAD_VALUE = 1009,

//            // Parameter supplied is not analogue nor digital
//            API_E_SET_BAD_PARAMETER = 1010,

//            // Failed to translate command into an id
//            API_E_EXEC_TRANSLATE_FAIL = 1011,

//            // Failed to execute command=
//            API_E_EXEC_CMD_FAIL = 1012,

//            // Failed to execute file macro
//            API_E_EXEC_MCF_FAIL = 1013,

//            // Failed to execute library macro
//            API_E_EXEC_MCL_FAIL = 1014,

//            // Command supplied is not implemented
//            API_E_EXEC_BAD_COMMAND = 1015,

//            // Grab command failed
//            API_E_GRAB_FAIL = 1016,

//            // Get Stage position failed
//            API_E_GET_STAGE_FAIL = 1017,

//            // Move Stage position failed
//            API_E_MOVE_STAGE_FAIL = 1018,

//            // API not initialised
//            API_E_NOT_INITIALISED = 1019,

//            // Failed to translate parameter to an id
//            API_E_NOTIFY_TRANSLATE_FAIL = 1020,

//            // Set notification failed
//            API_E_NOTIFY_SET_FAIL = 1021,

//            // Get limits failed
//            API_E_GET_LIMITS_FAIL = 1022,

//            // Get multiple parameters failed
//            API_E_GET_MULTI_FAIL = 1023,

//            // Set multiple parameters failed
//            API_E_SET_MULTI_FAIL = 1024,

//            // Missing API license
//            API_E_NOT_LICENSED = 1025,

//            // Reserved or not implemented
//            API_E_NOT_IMPLEMENTED = 1026,

//            // Failed to get user name (Remoting Interface only)
//            API_E_GET_USER_NAME_FAIL = 1027,

//            // Failed to get user idle state (Remoting Interface only)
//            API_E_GET_USER_IDLE_FAIL = 1028,

//            // Failed to get the last remoting connection error string (Remoting Interface Only)
//            API_E_GET_LAST_REMOTING_CONNECT_ERROR_FAIL = 1029,

//            // Failed to remotely logon to the EM Server (username and password may be incorrect or EM Server is not running or User is already logged on
//            API_E_EMSERVER_LOGON_FAILED = 1030,

//            // Failed to start the EM Server - this may be because the Server is already running or has an internal error. 
//            API_E_EMSERVER_START_FAILED = 1031,

//            // The command or parameter is currently disabled (you cannot execute or set it).
//            API_E_PARAMETER_IS_DISABLED = 1032,

//            // Remoting incorrectly configured, use RConfigure to correct
//            API_E_REMOTING_NOT_CONFIGURED = 2027,

//            // Remoting did not connect to the server
//            API_E_REMOTING_FAILED_TO_CONNECT = 2028,

//            // Remoting could not start (unknown reason)
//            API_E_REMOTING_COULD_NOT_CREATE_INTERFACE = 2029,

//            // Remoting: Remote server is not running currently.
//            API_E_REMOTING_EMSERVER_NOT_RUNNING = 2030,

//            // Remoting: Remote server has no user logged in
//            API_E_REMOTING_NO_USER_LOGGED_IN = 2031,


//            // Internal Defines, although they may be useful in your own program. TRS.
//            API_FIRST_REMOTING_ERROR_CODE = API_E_REMOTING_NOT_CONFIGURED,
//            API_LAST_REMOTING_ERROR_CODE = API_E_REMOTING_NO_USER_LOGGED_IN,

//            API_FIRST_ERROR_CODE = API_E_GET_TRANSLATE_FAIL,
//            API_LAST_ERROR_CODE = API_E_REMOTING_NO_USER_LOGGED_IN
//        }

//        // Notification codes that the Remoting server may send to you.
//        public enum ZeissNotificationCode
//        {
//            PARAMETER_CHANGE = 0,
//            PARAMETER_XY_CHANGE = 6,
//            EMSERVER_HAS_LOADED = 1111111,
//            EMSERVER_HAS_EXITED = 2222222,
//            EMSERVER_USER_LOGGED_ON = 3333333,
//            EMSERVER_USER_LOGGED_OFF = 4444444,
//            REMOTING_SERVER_EXITED = 5555555,
//            EMSERVER_FIBUI_HAS_LOADED = 6666666
//        }
//    }
//}

