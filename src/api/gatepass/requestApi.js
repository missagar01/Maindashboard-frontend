import { getWithFallback, postWithFallback } from "./requestWithFallback";

export const createVisitRequestApi = async (data) => {
    const formData = new FormData();

    formData.append("visitorName", data.visitorName);
    formData.append("mobileNumber", data.mobileNumber);
    formData.append("visitorAddress", data.visitorAddress || "");
    formData.append("purposeOfVisit", data.purposeOfVisit || "");
    formData.append("personToMeet", data.personToMeet);
    formData.append("dateOfVisit", data.dateOfVisit);
    formData.append("timeOfEntry", data.timeOfEntry);

    // image file (multer expects this)
    if (data.photoFile) {
        formData.append("photoData", data.photoFile);
    }

    return postWithFallback(["/requests", "/request", "/visits"], formData);
};

export const fetchVisitorByMobileApi = (mobile) => {
    return getWithFallback(
        [`/requests/by-mobile/${mobile}`, `/request/by-mobile/${mobile}`, `/visits/by-mobile/${mobile}`]
    );
};
