const cors = require("cors");
const driver = require("printer");
const express = require("express");
const find = require("find-process");
const bodyParser = require("body-parser");
const dayjs = require("dayjs");

const port = 3001;
const app = express();

const {
  ThermalPrinter,
  CharacterSet,
  BreakLine,
} = require("node-thermal-printer");

let printer = new ThermalPrinter({
  interface: `printer:${driver.getDefaultPrinterName()}`,
  driver,
  characterSet: CharacterSet.WPC1252,
  removeSpecialCharacters: false,
  lineCharacter: "=",
  breakLine: BreakLine.WORD,
  width: 48,
  options: {
    timeout: 5000,
  },
});

let printer_with_line = new ThermalPrinter({
  interface: `printer:${driver.getDefaultPrinterName()}`,
  driver,
  characterSet: CharacterSet.WPC1252,
  removeSpecialCharacters: false,
  lineCharacter: "_",
  breakLine: BreakLine.WORD,
  width: 48,
  options: {
    timeout: 5000,
  },
});

app.use(
  cors({
    origin: ["http://localhost:3000", "https://velayo-eservice.vercel.app"],
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("server is alive");
});

app.get("/kill-server", (req, res) => {
  const { pid } = req.query;

  if (pid) {
    find("pid", pid, function (err, resultList) {
      if (err) {
        throw new Error(err);
      }

      if (resultList.length > 0) {
        process.kill(resultList[0].pid);
        process.kill(-resultList[0].pid);
        return res.json({
          success: true,
          message: "Process Successfully Killed",
        });
      } else {
        return res.json({
          success: false,
          message: "no process on this PID",
        });
      }
    });

    return res.json({
      success: true,
      message: "Successfully killed the server",
      pid,
    });
  } else
    return res.json({
      success: false,
      message: "PID no provided",
    });
});

app.post("/print/shopee-collect", async (req, res) => {
  console.log(driver.getPrinters());
  return res.json({ success: true, message: "Print Successfully" });
  const { name, parcelNum, collectionPins } = req.body;

  if (
    [name, parcelNum, collectionPins].some((e) =>
      [null, undefined, ""].includes(e)
    )
  ) {
    return res.json({
      success: false,
      message: "There are some missing fields needed",
    });
  }

  if (parseInt(parcelNum.toString()) != collectionPins.length) {
    return res.json({
      success: false,
      message: "Parcel num and collection pins length didn't match",
    });
  }

  return printer_with_line.isPrinterConnected().then(async () => {
    printer_with_line.alignCenter();
    printer_with_line.bold(true);
    printer_with_line.setTextSize(1, 1);
    printer_with_line.setTypeFontB();
    printer_with_line.println("SHOPPE PARCEL COLLECTION SLIP");
    printer_with_line.newLine();
    printer_with_line.alignLeft();
    printer_with_line.setTextNormal();
    printer_with_line.println(" ".repeat(2) + "NAME ON PARCEL:" + name);
    printer_with_line.println(
      " ".repeat(2) + "NUMBER OF PARCELS:" + parcelNum.toString()
    );
    // printer.print(" ".repeat(2) + "COLLECTION PIN:" + "_".repeat(30));
    printer_with_line.bold(true);
    for (let i = 0; i < collectionPins.length; i++)
      printer_with_line.println(
        " ".repeat(2) + "COLLECTION PIN: " + collectionPins[i]
      );
    printer_with_line.partialCut();
    return await new Promise(async (resolve, reject) => {
      return await printer_with_line
        .execute()
        .then(() => {
          printer_with_line.clear();
          res.json({ success: true, message: "Print Successfully" });
          resolve("print success");
        })
        .catch((e) =>
          res.json({ success: false, message: "Printer Error: " + e })
        );
    });
  });
});

app.post("/print/receipt", async (req, res) => {
  const { type, billerName, receiptNo, refNo, fee, amount } = req.body;
  let { otherDetails } = req.body;
  otherDetails = JSON.parse(otherDetails);

  const excludeOtherDetails = ["billerId", "transactionType", "amount", "fee"];

  const getTitle = () => {
    switch (type) {
      case "bills":
        return "BILLS PAYMENT";
      case "wallet":
        return "E-WALLET";
      case "eload":
        return "E-LOAD";
      case "miscellaneous":
        return "MISCELLANEOUS";
      case "shopee":
        return "SHOPPE SELF COLLECT";
    }
  };

  const generateOtherDetails = (name, value) => {
    return [
      {
        text: `${name.replace(/_/g, " ").toLocaleUpperCase()}:`,
        align: "LEFT",
        width: 0.5,
        bold: true,
      },
      {
        text: (typeof value == "number" ? value.toString() : value).includes(
          "_money"
        )
          ? value.split("_")[0] + ".00"
          : (typeof value == "number"
              ? value.toString()
              : value
            ).toLocaleUpperCase(),
        align: "RIGHT",
        width: 0.5,
        bold: true,
      },
    ];
  };
  return printer.isPrinterConnected().then(async () => {
    printer.alignCenter();
    printer.bold(true);
    printer.setTextQuadArea();
    printer.setTypeFontB();
    printer.println("VELAYO BILLS PAYMENT AND");
    printer.println("REMITTANCE SERVICES");
    printer.setTextNormal();
    printer.newLine();
    printer.println("Owned and Operated by:");
    printer.println("KRISTOPHER RYAN V. VELAYO");
    printer.newLine();
    printer.println("P9 SUICO ST BRGY TABOK MANDAUE CITY CEBU");
    printer.newLine();
    printer.println("Contact #:");
    printer.println("NON-VAT Reg. TIN 282-246-742-00000");
    printer.println("REPRINT RECEIPT");
    printer.newLine();
    printer.println(`ACKNOWLEGDEMENT RECEIPT #: ${receiptNo}`);
    printer.newLine();
    printer.bold(true);
    printer.println(getTitle());
    printer.drawLine();
    printer.newLine();
    printer.println("TRANSACTION DETAILS");
    printer.newLine();
    printer.tableCustom([
      // row
      { text: "TRANSACTION REF NO:", align: "LEFT", width: 0.5, bold: true },
      {
        text: refNo.toLocaleUpperCase(),
        align: "RIGHT",
        width: 0.5,
        bold: true,
      },
      // end row
      // row
      { text: "BILLER NAME:", align: "LEFT", width: 0.5, bold: true },
      {
        text: billerName.toLocaleUpperCase(),
        align: "RIGHT",
        width: 0.5,
        bold: true,
      },
      // end row
      // other details generation
      ...[].concat(
        ...Object.keys(otherDetails)
          .filter(
            (e) =>
              !excludeOtherDetails.includes(e) &&
              !e.includes("pin_collection_#")
          )
          .map((e) => generateOtherDetails(e, otherDetails[e]))
      ),
      // end other details
      { text: "AMOUNT:", align: "LEFT", width: 0.5, bold: true },
      {
        text: `${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.00`,
        align: "RIGHT",
        width: 0.5,
      },
      // end row
      // row
      { text: "CONVENIENCE FEE:", align: "LEFT", width: 0.5, bold: true },
      {
        text: `${fee.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.00`,
        align: "RIGHT",
        width: 0.5,
      },
      // end row
      // row
      { text: "TOTAL AMOUNT:", align: "LEFT", width: 0.5, bold: true },
      {
        text: `${(amount + fee)
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.00`,
        align: "RIGHT",
        width: 0.5,
      },
      // end row
    ]);
    printer.newLine();
    printer.bold(true);
    printer.drawLine();
    printer.newLine();
    printer.println("THIS IS NOT AN OFFICIAL RECEIPT");
    printer.println("THIS OR WILL BE ISSUED BY THE BILLING");
    printer.println("COMPANY");
    printer.newLine();
    printer.alignLeft();
    printer.println(
      `DATE/TIME: ${dayjs(new Date()).format("YYYY-MM-DD hh:mmA")}`
    );
    printer.println(
      "MACHINE SERIAL NO. : ASUS / X509J / L4N0CX01M67615B & DELL / Inspiren 3501 / F470HB3"
    );
    printer.newLine();
    printer.println(
      "SPM NO: SP112022-080-0111027-00000 & SP112022-080-0111028-00000"
    );
    printer.newLine();
    printer.bold(true);
    printer.alignCenter();
    printer.println("Powered By VELAYO E-SERVICE");
    // printer.partialCut();

    return await new Promise(async (resolve, reject) => {
      return await printer
        .execute()
        .then(() => {
          printer.clear();
          res.json({ success: true, message: "Print Successfully" });
          resolve("print success");
        })
        .catch((e) =>
          res.json({ success: false, message: "Printer Error: " + e })
        );
    });
  });
});

app.listen(port, () => {
  console.log(`Express server running at http://localhost:${port}/`);
});
