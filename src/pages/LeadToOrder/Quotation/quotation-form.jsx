"use client"

import { useState, useEffect } from "react"
import QuotationDetails from "./quotation-details"
import ConsignorDetails from "./consignor-details"
import ConsigneeDetails from "./consignee-details"
import ItemsTable from "./items-table"
import TermsAndConditions from "./terms and conditions"
import BankDetails from "./bank-details"
import NotesSection from "./notes-section"
import SpecialOfferSection from "./special-offer-section"
import { getNextQuotationNumber } from "./quotation-service"
import * as leadToOrderAPI from "../../../api/leadToOrderAPI";

const QuotationForm = ({
  quotationData,
  handleInputChange,
  handleItemChange,
  handleFlatDiscountChange,
  handleAddItem,
  handleNoteChange,
  addNote,
  removeNote,
  hiddenFields,
  toggleFieldVisibility,
  isRevising,
  existingQuotations,
  selectedQuotation,
  handleSpecialDiscountChange,
  handleQuotationSelect,
  isLoadingQuotation,
  specialDiscount,
  setSpecialDiscount,
  selectedReferences,
  setSelectedReferences,
  imageform,
  addSpecialOffer,
  removeSpecialOffer,
  handleSpecialOfferChange,
  setQuotationData,
  hiddenColumns,
  setHiddenColumns,
}) => {
  const [dropdownData, setDropdownData] = useState({})
  const [stateOptions, setStateOptions] = useState(["Select State"])
  const [companyOptions, setCompanyOptions] = useState(["Select Company"])
  const [referenceOptions, setReferenceOptions] = useState(["Select Reference"])
  const [preparedByOptions, setPreparedByOptions] = useState([""])
  const [productCodes, setProductCodes] = useState([])
  const [productNames, setProductNames] = useState([])
  const [productData, setProductData] = useState({})
  const [isItemsLoading, setIsItemsLoading] = useState(false);

  // NEW: Lead number states
  const [showLeadNoDropdown, setShowLeadNoDropdown] = useState(false)
  const [leadNoOptions, setLeadNoOptions] = useState(["Select Lead No."])
  const [leadNoData, setLeadNoData] = useState({})


  // Fetch dropdown data for states and corresponding details
  // Update the useEffect that fetches dropdown data
  useEffect(() => {
    const fetchBackendDropdowns = async () => {
      try {
        const response = await leadToOrderAPI.getQuotationDropdowns();
        const json = response.data;

        if (json.success && json.dropdowns) {
          setPreparedByOptions(json.dropdowns.prepared_by || []);
          setCompanyOptions(json.dropdowns.direct_company_name || []);

          const stateOptionsFromBackend = [
            ...(json.dropdowns.state || []),
            ...(json.dropdowns.sp_state || []),
            ...(json.dropdowns.consignee_state || []),
            ...(json.dropdowns.direct_state || [])
          ].filter(Boolean);

          const uniqueStates = [...new Set(stateOptionsFromBackend)];
          const filteredStates = uniqueStates.filter(s => s !== "Select State");
          setStateOptions(filteredStates.length > 0 ? ["Select State", ...filteredStates] : ["Select State"]);

          setReferenceOptions(json.dropdowns.sp_name || []);

          const companies = {};
          if (json.dropdowns.direct_company_name && json.dropdowns.direct_company_name.length > 0) {
            json.dropdowns.direct_company_name.forEach((company, index) => {
              if (company && company !== "Select Company") {
                companies[company] = {
                  address: (json.dropdowns.direct_billing_address && json.dropdowns.direct_billing_address[index]) || "",
                  state: (json.dropdowns.direct_state && json.dropdowns.direct_state[index]) || "",
                  contactName: (json.dropdowns.direct_client_name && json.dropdowns.direct_client_name[index]) || "",
                  contactNo: (json.dropdowns.direct_client_contact_no && json.dropdowns.direct_client_contact_no[index]) || "",
                  gstin: (json.dropdowns.consignee_gstin_uin && json.dropdowns.consignee_gstin_uin[index]) || "",
                  stateCode: (json.dropdowns.consignee_state_code && json.dropdowns.consignee_state_code[index]) || "",
                };
              }
            });
          }

          setDropdownData({
            ...json.dropdowns,
            companies: companies
          });
        } else {
          setStateOptions(["Select State"]);
          setCompanyOptions(["Select Company"]);
          setReferenceOptions(["Select Reference"]);
          setPreparedByOptions([""]);
        }
      } catch (e) {
        setStateOptions(["Select State"]);
        setCompanyOptions(["Select Company"]);
        setReferenceOptions(["Select Reference"]);
        setPreparedByOptions([""]);
      }
    };

    fetchBackendDropdowns();
  }, []);


  // NEW: Fetch lead numbers from both sheets with filtering conditions
  // NEW: Fetch lead numbers from backend instead of Google Sheets
  useEffect(() => {
    const fetchLeadNumbers = async () => {
      try {
        const response = await leadToOrderAPI.getQuotationLeadNumbers();
        const result = response.data;

        if (result.success) {
          setLeadNoOptions(["Select Lead No.", ...result.leadNumbers]);
          setLeadNoData(result.leadData);
        } else {
          setLeadNoOptions(["Select Lead No."]);
        }
      } catch (error) {
        setLeadNoOptions(["Select Lead No."]);
      }
    };

    fetchLeadNumbers();
  }, []);

  const handleSpecialDiscountChangeWrapper = (value) => {
    const discount = Number(value) || 0
    setSpecialDiscount(discount)
    handleSpecialDiscountChange(discount)
  }

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await leadToOrderAPI.getProducts();
        const json = response.data;

        if (!json.success) return;

        const codes = ["Select Code"];
        const names = ["Select Product"];
        const dataMap = {};
        const seenNames = new Set();
        const seenCodes = new Set();

        json.products.forEach((p) => {
          if (p.item_code && !seenCodes.has(p.item_code)) {
            codes.push(p.item_code);
            seenCodes.add(p.item_code);
          }
          if (p.item_name && !seenNames.has(p.item_name)) {
            names.push(p.item_name);
            seenNames.add(p.item_name);
          }
          if (p.item_code) {
            dataMap[p.item_code] = { name: p.item_name, code: p.item_code, description: "", rate: 0 };
          }
          if (p.item_name) {
            dataMap[p.item_name] = { name: p.item_name, code: p.item_code, description: "", rate: 0 };
          }
        });

        setProductCodes(codes);
        setProductNames(names);
        setProductData(dataMap);
      } catch (err) {
        // Product fetch error
      }
    };

    fetchProducts();
  }, []);


  // REMOVED: Function to handle quotation number updates - no longer needed
  // as we don't want to change quotation number when selecting company/lead

  // Helper function to safely convert value to string
  const safeToString = (value) => {
    if (value === null || value === undefined) return ""
    return String(value)
  }

  // NEW: Auto-fill items from lead data
  const autoFillItemsFromLead = async (leadData, sheetType) => {
    try {
      const autoItems = [];

      // Parse item_qty JSON from database
      if (leadData.item_qty) {
        try {
          const itemData = JSON.parse(leadData.item_qty);
          if (Array.isArray(itemData)) {
            itemData.forEach((item) => {
              if (item.name && item.quantity !== undefined && item.quantity !== null) {
                const qty = isNaN(Number(item.quantity)) ? 1 : Number(item.quantity);
                autoItems.push({
                  name: item.name,
                  qty: qty,
                });
                console.log(`Added item from ${sheetType} lead: ${item.name}, qty: ${qty}`);
              }
            });
          }
        } catch (parseError) {
          console.error(`Error parsing item_qty from ${sheetType}:`, parseError);
        }
      }

      // Update items if found from lead data
      if (autoItems.length > 0) {
        console.log(`Creating ${autoItems.length} items from ${sheetType} lead data...`);

        const newItems = autoItems.map((item, index) => {
          // Auto-fill product code from productData with better matching
          let productInfo = null;
          let productCode = "";
          let productDescription = "";
          let productRate = 0;

          // Try exact match first
          if (productData[item.name]) {
            productInfo = productData[item.name];
          } else {
            // Try case-insensitive match
            const matchingKey = Object.keys(productData).find(key =>
              key.toLowerCase().trim() === item.name.toLowerCase().trim()
            );
            if (matchingKey) {
              productInfo = productData[matchingKey];
            }
          }

          if (productInfo) {
            productCode = productInfo.code || "";
            productDescription = productInfo.description || "";
            productRate = productInfo.rate || 0;
          }

          console.log(`Lead Item ${index + 1}: "${item.name}" -> code: "${productCode}", rate: ${productRate}`);

          // If no code found, try a partial match
          if (!productCode) {
            const partialMatch = Object.keys(productData).find(key =>
              key.toLowerCase().includes(item.name.toLowerCase().substring(0, 10)) ||
              item.name.toLowerCase().includes(key.toLowerCase().substring(0, 10))
            );
            if (partialMatch && productData[partialMatch]) {
              productCode = productData[partialMatch].code || "";
              productDescription = productData[partialMatch].description || "";
              productRate = productData[partialMatch].rate || 0;
              console.log(`Found partial match for "${item.name}": "${partialMatch}" -> code: "${productCode}"`);
            }
          }

          return {
            id: index + 1,
            code: productCode, // Auto-filled from productData
            name: item.name,
            description: productDescription, // Auto-filled from productData
            gst: 18,
            qty: item.qty,
            units: "Nos",
            rate: productRate, // Auto-filled from productData
            discount: 0,
            flatDiscount: 0,
            amount: item.qty * productRate, // Calculate initial amount
          };
        });

        handleInputChange("items", newItems);
        console.log("Items auto-filled from lead selection:", newItems);
      } else {
        console.log("No items found for this lead");
      }

    } catch (error) {
      console.error("Error auto-filling items from lead:", error);
    }
  };

  // FIXED: Handle lead number selection and autofill - NO quotation number change
  // FIXED: Handle lead number selection and autofill - NO quotation number change
  // FIXED: Handle lead number selection using backend
  // FIXED: Handle lead number selection using backend with correct field names
  const handleLeadNoSelect = async (selectedLeadNo) => {
    if (!selectedLeadNo || selectedLeadNo === "Select Lead No.") {
      return;
    }

    setIsItemsLoading(true);
    try {
      const response = await leadToOrderAPI.getQuotationLeadDetails(selectedLeadNo);
      const result = response.data;


      if (!result.success) {
        console.error("Failed to fetch lead details:", result.message);
        setIsItemsLoading(false);
        return;
      }

      const leadData = result.data;
      console.log("Selected lead data from backend:", leadData);

      // Fill consignee details based on sheet type with CORRECT FIELD NAMES
      if (result.sheet === "FMS") {
        handleInputChange("consigneeName", leadData.company_name || "");
        handleInputChange("consigneeAddress", leadData.address || "");
        handleInputChange("consigneeState", leadData.state || "");
        handleInputChange("consigneeContactName", leadData.salesperson_name || ""); // CORRECT FIELD
        handleInputChange("consigneeContactNo", leadData.phone_number || "");       // CORRECT FIELD
        handleInputChange("consigneeGSTIN", leadData.gstin || "");

        // Auto-fill items for FMS leads
        await autoFillItemsFromLead(leadData, "FMS");

      } else if (result.sheet === "ENQUIRY") {
        handleInputChange("consigneeName", leadData.company_name || "");
        handleInputChange("consigneeAddress", leadData.address || "");
        handleInputChange("consigneeState", leadData.state || "");
        handleInputChange("consigneeContactName", leadData.sales_person_name || ""); // CORRECT FIELD
        handleInputChange("consigneeContactNo", leadData.phone_number || "");        // CORRECT FIELD
        handleInputChange("consigneeGSTIN", leadData.gstin || "");

        // Auto-fill items for ENQUIRY leads
        await autoFillItemsFromLead(leadData, "ENQUIRY");
      }

      // IMPORTANT: Fill additional company details from dropdown data if available
      const companyName = leadData.company_name;
      if (companyName && dropdownData.companies && dropdownData.companies[companyName]) {
        const companyDetails = dropdownData.companies[companyName];

        // Fill additional company details if not already filled from lead data
        if (!leadData.address && companyDetails.address) {
          handleInputChange("consigneeAddress", companyDetails.address);
        }
        if (!leadData.state && companyDetails.state) {
          handleInputChange("consigneeState", companyDetails.state);
        }
        if (!leadData.salesperson_name && !leadData.sales_person_name && companyDetails.contactName) {
          handleInputChange("consigneeContactName", companyDetails.contactName);
        }
        if (!leadData.phone_number && companyDetails.contactNo) {
          handleInputChange("consigneeContactNo", companyDetails.contactNo);
        }
        if (!leadData.gstin && companyDetails.gstin) {
          handleInputChange("consigneeGSTIN", companyDetails.gstin);
        }
        if (companyDetails.stateCode) {
          handleInputChange("consigneeStateCode", companyDetails.stateCode);
        }
      }

    } catch (error) {
      // Error fetching lead details
    } finally {
      setIsItemsLoading(false);
    }
  };

  // REMOVED: handleAutoFillItems function - no longer using Google Sheets
  // Items are now auto-filled from lead selection via handleLeadNoSelect
  const handleAutoFillItems = async (companyName) => {
    // This function is kept for compatibility but does nothing
    // Items are auto-filled when lead number is selected
    return;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <QuotationDetails
            quotationData={quotationData}
            handleInputChange={handleInputChange}
            isRevising={isRevising}
            existingQuotations={existingQuotations}
            selectedQuotation={selectedQuotation}
            handleQuotationSelect={handleQuotationSelect}
            isLoadingQuotation={isLoadingQuotation}
            preparedByOptions={preparedByOptions}
            stateOptions={stateOptions}
            dropdownData={dropdownData}
          />

          <ConsignorDetails
            quotationData={quotationData}
            handleInputChange={handleInputChange}
            referenceOptions={referenceOptions}
            selectedReferences={selectedReferences}
            setSelectedReferences={setSelectedReferences}
            dropdownData={dropdownData}
          />
        </div>

        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <ConsigneeDetails
            quotationData={quotationData}
            handleInputChange={handleInputChange}
            companyOptions={companyOptions}
            dropdownData={dropdownData}
            onAutoFillItems={handleAutoFillItems}
            showLeadNoDropdown={showLeadNoDropdown}
            setShowLeadNoDropdown={setShowLeadNoDropdown}
            leadNoOptions={leadNoOptions}
            handleLeadNoSelect={handleLeadNoSelect}
          />
        </div>
      </div>

      <ItemsTable
        quotationData={quotationData}
        handleItemChange={handleItemChange}
        handleAddItem={handleAddItem}
        handleSpecialDiscountChange={handleSpecialDiscountChangeWrapper}
        specialDiscount={specialDiscount}
        setSpecialDiscount={setSpecialDiscount}
        productCodes={productCodes}
        productNames={productNames}
        productData={productData}
        setQuotationData={setQuotationData}
        isLoading={isItemsLoading}
        hiddenColumns={hiddenColumns}
        setHiddenColumns={setHiddenColumns}
      />

      <TermsAndConditions
        quotationData={quotationData}
        handleInputChange={handleInputChange}
        hiddenFields={hiddenFields}
        toggleFieldVisibility={toggleFieldVisibility}
      />

      <NotesSection
        quotationData={quotationData}
        handleNoteChange={handleNoteChange}
        addNote={addNote}
        removeNote={removeNote}
      />

      <BankDetails quotationData={quotationData} handleInputChange={handleInputChange} imageform={imageform} />
    </div>
  )
}

export default QuotationForm
