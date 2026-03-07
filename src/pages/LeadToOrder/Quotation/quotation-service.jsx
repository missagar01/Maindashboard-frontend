"use client"

import { useState, useEffect } from "react"
import { DownloadIcon, SaveIcon, ShareIcon } from "../Icons"
import image1 from "../assests/WhatsApp Image 2025-05-14 at 4.11.43 PM.jpeg"
import imageform from "../assests/WhatsApp Image 2025-05-14 at 4.11.54 PM.jpeg"
import QuotationHeader from "./quotation-header"
import QuotationForm from "./quotation-form"
import QuotationPreview from "./quotation-preview"
import { generatePDFFromData } from "./pdf-generator"
import { useQuotationData } from "./use-quotation-data"
import * as leadToOrderAPI from "../../../api/leadToOrderAPI";
// SIMPLIFIED: Simple QN number generation without company prefix
export const getNextQuotationNumber = async () => {
  try {
    const response = await leadToOrderAPI.getNextQuotationNumber();
    const data = response.data;


    if (data.success) {
      return data.nextNumber;
    }

    return "QN-001";
  } catch (err) {
    return "QN-001";
  }
};


// REMOVED: getCompanyPrefix function - no longer needed, using backend API instead

function Quotation() {
  const [activeTab, setActiveTab] = useState("edit")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quotationLink, setQuotationLink] = useState("")
  const [pdfUrl, setPdfUrl] = useState("")
  const [isRevising, setIsRevising] = useState(false)
  const [existingQuotations, setExistingQuotations] = useState([])
  const [selectedQuotation, setSelectedQuotation] = useState("")
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(false)
  const [specialDiscount, setSpecialDiscount] = useState(0)
  const [selectedReferences, setSelectedReferences] = useState([])

  // NEW: Add hidden columns state
  const [hiddenColumns, setHiddenColumns] = useState({
    hideDisc: false,
    hideFlatDisc: false,
    hideTotalFlatDisc: false,
    hideSpecialDiscount: false,
  })

  // Popup state
  const [showPopup, setShowPopup] = useState(false)
  const [popupMessage, setPopupMessage] = useState("")
  const [popupType, setPopupType] = useState("success")

  const showNotification = (message, type = "success") => {
    setPopupMessage(message)
    setPopupType(type)
    setShowPopup(true)
    setTimeout(() => {
      setShowPopup(false)
    }, 3000)
  }

  // Check if we're in view mode
  const params = new URLSearchParams(window.location.search)
  const isViewMode = params.has("view")

  // Use the custom hook for quotation data
  const {
    quotationData,
    setQuotationData,
    handleInputChange,
    handleItemChange,
    handleFlatDiscountChange,
    handleSpecialDiscountChange,
    handleAddItem,
    handleNoteChange,
    addNote,
    removeNote,
    hiddenFields,
    toggleFieldVisibility,
    addSpecialOffer,
    removeSpecialOffer,
    handleSpecialOfferChange,
  } = useQuotationData(specialDiscount)

  const handleSpecialDiscountChangeWrapper = (value) => {
    const discount = Number(value) || 0
    setSpecialDiscount(discount)
    handleSpecialDiscountChange(discount)
  }

  // Fetch existing quotations when component mounts or when revising
  useEffect(() => {
    const fetchExistingQuotations = async () => {
      try {
        const response = await leadToOrderAPI.getQuotationNumbers()
        if (response.data && response.data.success) {
          setExistingQuotations(response.data.quotationNumbers)
        }

      } catch (error) {
        setExistingQuotations([])
      }
    }

    if (isRevising) {
      fetchExistingQuotations()
    }
  }, [isRevising])

  // Initialize quotation number
  useEffect(() => {
    const initializeQuotationNumber = async () => {
      try {
        const nextQuotationNumber = await getNextQuotationNumber()
        setQuotationData((prev) => ({
          ...prev,
          quotationNo: nextQuotationNumber,
        }))
      } catch (error) {
        // Error initializing quotation number
      }
    }

    initializeQuotationNumber()
  }, [setQuotationData])

  // Load quotation data from URL if in view mode
  useEffect(() => {
    const viewId = params.get("view")

    if (viewId) {
      const savedQuotation = localStorage.getItem(viewId)

      if (savedQuotation) {
        try {
          const parsedData = JSON.parse(savedQuotation)
          setQuotationData(parsedData)
          setActiveTab("preview")
        } catch (error) {
          // Error loading quotation data
        }
      }
    }
  }, [setQuotationData])

  const toggleRevising = () => {
    const newIsRevising = !isRevising
    setIsRevising(newIsRevising)

    if (newIsRevising) {
      setSelectedQuotation("")
    }
  }

  const handleQuotationSelect = async (quotationNo) => {
    if (!quotationNo) return;

    try {
      setIsLoadingQuotation(true);

      const response = await leadToOrderAPI.getQuotationByNumber(quotationNo);
      const result = response.data;


      if (!result.success) {
        // Quotation not found
        return;
      }

      const q = result.data;

      setQuotationData({
        ...quotationData,
        quotationNo: q.quotation_no,
        date: q.quotation_date,
        preparedBy: q.prepared_by,

        consignorState: q.consigner_state,
        consignorName: q.reference_name,
        consignorAddress: q.consigner_address,
        consignorMobile: q.consigner_mobile,
        consignorPhone: q.consigner_phone,
        consignorGSTIN: q.consigner_gstin,
        consignorStateCode: q.consigner_state_code,

        consigneeName: q.company_name,
        consigneeAddress: q.consignee_address,
        shipTo: q.ship_to,
        consigneeState: q.consignee_state,
        consigneeContactName: q.contact_name,
        consigneeContactNo: q.contact_no,
        consigneeGSTIN: q.consignee_gstin,
        consigneeStateCode: q.consignee_state_code,
        msmeNumber: q.msme_no,

        validity: q.validity,
        paymentTerms: q.payment_terms,
        delivery: q.delivery,
        freight: q.freight,
        insurance: q.insurance,
        taxes: q.taxes,
        notes: q.notes ? q.notes.split("|") : [""],

        accountNo: q.account_no,
        bankName: q.bank_name,
        bankAddress: q.bank_address,
        ifscCode: q.ifsc_code,
        email: q.email,
        website: q.website,
        pan: q.pan,

        items: q.items || [],
        grandTotal: q.grand_total
      });

      setActiveTab("edit");

    } catch (error) {
      // Failed to load quotation
    } finally {
      setIsLoadingQuotation(false);
    }
  };

  const handleGeneratePDF = () => {
    setIsGenerating(true)

    try {
      const base64Data = generatePDFFromData(quotationData, selectedReferences, specialDiscount)

      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: "application/pdf" })

      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `Quotation_${quotationData.quotationNo}.pdf`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(link.href)

      setIsGenerating(false)
      showNotification("PDF generated and downloaded successfully!", "success")
    } catch (error) {
      showNotification("Failed to generate PDF", "error")
      setIsGenerating(false)
    }
  }


  const handleGenerateLink = () => {
    setIsGenerating(true)

    const quotationId = `quotation_${Date.now()}`
    localStorage.setItem(quotationId, JSON.stringify(quotationData))

    const link = `${window.location.origin}${window.location.pathname}?view=${quotationId}`

    setQuotationLink(link)
    setIsGenerating(false)
    showNotification("Quotation link has been successfully generated and is ready to share.", "success")
  }

  const convertToSQLDate = (dateString) => {
    if (!dateString) return null;
    const [day, month, year] = dateString.split("/");
    return `${year}-${month}-${day}`;
  };

  const handleSaveQuotation = async () => {
    if (!quotationData.consigneeName) {
      showNotification("Please select a company name", "error")
      return
    }

    if (!quotationData.preparedBy) {
      showNotification("Please enter prepared by name", "error")
      return
    }

    setIsSubmitting(true)

    try {
      // 1️⃣ Generate PDF from existing function
      const base64Data = generatePDFFromData(
        quotationData,
        selectedReferences,
        specialDiscount,
        hiddenColumns || {}
      );

      // 2️⃣ Upload PDF to backend
      const uploadRes = await leadToOrderAPI.uploadQuotationPDF(base64Data, quotationData.quotationNo);
      const uploaded = uploadRes.data;


      if (!uploaded.success) {
        showNotification("PDF upload failed", "error");
        setIsSubmitting(false);
        return;
      }

      // 3️⃣ Save S3 URL
      const s3PdfUrl = uploaded.url;
      setPdfUrl(s3PdfUrl);

      // 4️⃣ Calculate totals for backend
      const taxableAmount = Math.max(
        0,
        quotationData.subtotal - quotationData.totalFlatDiscount
      );
      const special = Number(specialDiscount) || 0;

      let grandTotal = 0;

      if (quotationData.isIGST) {
        const igstAmt = taxableAmount * (quotationData.igstRate / 100);
        grandTotal = taxableAmount + igstAmt - special;
      } else {
        const cgstAmt = taxableAmount * (quotationData.cgstRate / 100);
        const sgstAmt = taxableAmount * (quotationData.sgstRate / 100);
        grandTotal = taxableAmount + cgstAmt + sgstAmt - special;
      }

      const finalGrand = Number(grandTotal.toFixed(2));

      // 5️⃣ Prepare items JSON
      const formattedItems = quotationData.items.map((item) => ({
        code: item.code,
        name: item.name,
        description: item.description,
        gst: item.gst,
        qty: item.qty,
        units: item.units,
        rate: item.rate,
        discount: item.discount,
        flatDiscount: item.flatDiscount,
        amount: item.amount,
      }));

      // 6️⃣ Payload for backend save
      const payload = {
        quotationNo: quotationData.quotationNo,
        quotationDate: convertToSQLDate(quotationData.date),
        preparedBy: quotationData.preparedBy,

        consignerState: quotationData.consignorState,
        referenceName: quotationData.consignorName,
        consignerAddress: quotationData.consignorAddress,
        consignerMobile: quotationData.consignorMobile,
        consignerPhone: quotationData.consignorPhone,
        consignerGstin: quotationData.consignorGSTIN,
        consignerStateCode: quotationData.consignorStateCode,

        companyName: quotationData.consigneeName,
        consigneeAddress: quotationData.consigneeAddress,
        shipTo: quotationData.shipTo,
        consigneeState: quotationData.consigneeState,
        contactName: quotationData.consigneeContactName,
        contactNo: quotationData.consigneeContactNo,
        consigneeGstin: quotationData.consigneeGSTIN,
        consigneeStateCode: quotationData.consigneeStateCode,
        msmeNo: quotationData.msmeNumber,

        validity: quotationData.validity,
        paymentTerms: quotationData.paymentTerms,
        delivery: quotationData.delivery,
        freight: quotationData.freight,
        insurance: quotationData.insurance,
        taxes: quotationData.taxes,
        notes: quotationData.notes.join("|"),

        accountNo: quotationData.accountNo,
        bankName: quotationData.bankName,
        bankAddress: quotationData.bankAddress,
        ifscCode: quotationData.ifscCode,
        email: quotationData.email,
        website: quotationData.website,
        pan: quotationData.pan,

        items: formattedItems,
        pdfUrl: s3PdfUrl,
        grandTotal: finalGrand,
      };

      // 7️⃣ Save to backend
      const saveRes = await leadToOrderAPI.createQuotation(payload);
      const result = saveRes.data;


      if (!result.success) {
        showNotification("Error saving quotation to backend", "error");
        return;
      }

      showNotification("Quotation + PDF saved successfully!", "success");

      // Reset form
      const nextQuotationNumber = await getNextQuotationNumber()
      setQuotationData({
        quotationNo: nextQuotationNumber,
        date: new Date().toLocaleDateString("en-GB"),
        consignorState: "",
        consignorName: "",
        consignorAddress: "",
        consignorMobile: "",
        consignorPhone: "",
        consignorGSTIN: "",
        consignorStateCode: "",
        companyName: "",
        consigneeName: "",
        consigneeAddress: "",
        consigneeState: "",
        consigneeContactName: "",
        consigneeContactNo: "",
        consigneeGSTIN: "",
        consigneeStateCode: "",
        msmeNumber: "",
        items: [
          {
            id: 1,
            code: "",
            name: "",
            gst: 18,
            qty: 1,
            units: "Nos",
            rate: 0,
            discount: 0,
            flatDiscount: 0,
            amount: 0,
          },
        ],
        totalFlatDiscount: 0,
        subtotal: 0,
        cgstRate: 9,
        sgstRate: 9,
        cgstAmount: 0,
        sgstAmount: 0,
        total: 0,
        validity: "The above quoted prices are valid up to 5 days from date of offer.",
        paymentTerms: "100% advance payment in the mode of NEFT, RTGS & DD",
        delivery: "Material is ready in our stock",
        freight: "Extra as per actual.",
        insurance: "Transit insurance for all shipment is at Buyer's risk.",
        taxes: "Extra as per actual.",
        accountNo: "",
        bankName: "",
        bankAddress: "",
        ifscCode: "",
        email: "",
        website: "",
        pan: "",
        notes: [""],
        preparedBy: "",
        specialOffers: [""],
      })
    } catch (error) {
      showNotification("Error: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <QuotationHeader image={image1} isRevising={isRevising} toggleRevising={toggleRevising} />

      <div className="bg-white rounded-lg shadow border">
        <div className="border-b">
          <div className="flex">
            <button
              className={`px-4 py-2 font-medium ${activeTab === "edit"
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-tl-lg"
                : "text-gray-600"
                }`}
              onClick={() => setActiveTab("edit")}
              disabled={isViewMode}
            >
              Edit Quotation
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === "preview" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white" : "text-gray-600"
                }`}
              onClick={() => setActiveTab("preview")}
            >
              Preview
            </button>
          </div>
        </div>

        <div className="p-4">
          {activeTab === "edit" ? (
            <QuotationForm
              quotationData={quotationData}
              handleInputChange={handleInputChange}
              handleItemChange={handleItemChange}
              handleFlatDiscountChange={handleFlatDiscountChange}
              handleAddItem={handleAddItem}
              handleNoteChange={handleNoteChange}
              addNote={addNote}
              removeNote={removeNote}
              hiddenFields={hiddenFields}
              toggleFieldVisibility={toggleFieldVisibility}
              isRevising={isRevising}
              existingQuotations={existingQuotations}
              selectedQuotation={selectedQuotation}
              handleQuotationSelect={handleQuotationSelect}
              isLoadingQuotation={isLoadingQuotation}
              handleSpecialDiscountChange={handleSpecialDiscountChangeWrapper}
              specialDiscount={specialDiscount}
              setSpecialDiscount={setSpecialDiscount}
              selectedReferences={selectedReferences}
              setSelectedReferences={setSelectedReferences}
              imageform={imageform}
              addSpecialOffer={addSpecialOffer}
              removeSpecialOffer={removeSpecialOffer}
              handleSpecialOfferChange={handleSpecialOfferChange}
              setQuotationData={setQuotationData}
              hiddenColumns={hiddenColumns}
              setHiddenColumns={setHiddenColumns}
            />
          ) : (
            <QuotationPreview
              quotationData={quotationData}
              quotationLink={quotationLink}
              pdfUrl={pdfUrl}
              selectedReferences={selectedReferences}
              specialDiscount={specialDiscount}
              imageform={imageform}
              handleGenerateLink={handleGenerateLink}
              handleGeneratePDF={handleGeneratePDF}
              isGenerating={isGenerating}
              isSubmitting={isSubmitting}
              hiddenColumns={hiddenColumns}
            />
          )}
        </div>
      </div>

      {activeTab === "edit" && (
        <div className="flex justify-between mt-4">
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
            onClick={handleSaveQuotation}
            disabled={isSubmitting || isGenerating}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <SaveIcon className="h-4 w-4 mr-2" />
                Save Quotation
              </>
            )}
          </button>
          <div className="space-x-2">
            <button
              className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-md flex items-center inline-flex"
              onClick={handleGenerateLink}
              disabled={isGenerating || isSubmitting}
            >
              <ShareIcon className="h-4 w-4 mr-2" />
              Generate Link
            </button>
            <button
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center inline-flex"
              onClick={handleGeneratePDF}
              disabled={isGenerating || isSubmitting}
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating..." : "Generate PDF"}
            </button>
          </div>
        </div>
      )}

      {/* Popup Notification */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className={`relative mx-4 p-6 rounded-lg shadow-2xl max-w-sm w-full transform transition-all duration-300 pointer-events-auto ${popupType === "success"
            ? 'bg-green-50 border-2 border-green-400'
            : popupType === "error"
              ? 'bg-red-50 border-2 border-red-400'
              : 'bg-blue-50 border-2 border-blue-400'
            }`}>
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-center justify-center mb-4">
              {popupType === "success" ? (
                <svg className="h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : popupType === "error" ? (
                <svg className="h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="h-12 w-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="text-center">
              <h3 className={`text-lg font-semibold mb-2 ${popupType === "success" ? 'text-green-800'
                : popupType === "error" ? 'text-red-800'
                  : 'text-blue-800'
                }`}>
                {popupType === "success" ? "Success!" : popupType === "error" ? "Error!" : "Info"}
              </h3>
              <p className={
                popupType === "success" ? 'text-green-700'
                  : popupType === "error" ? 'text-red-700'
                    : 'text-blue-700'
              }>
                {popupMessage}
              </p>
            </div>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-1">
              <div
                className={`h-1 rounded-full ${popupType === "success" ? 'bg-green-500'
                  : popupType === "error" ? 'bg-red-500'
                    : 'bg-blue-500'
                  }`}
                style={{
                  width: '100%',
                  animation: 'shrink 3s linear forwards'
                }}
              />
            </div>
            <style>{`
              @keyframes shrink {
                from {
                  width: 100%;
                }
                to {
                  width: 0%;
                }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  )
}

export default Quotation
