import React, { useCallback, useEffect, useState } from "react";
import { useRemoteConfig } from "../../providers/remote-config-provider";
import { useUser } from "../../providers/user-provider";
import { API } from "../../services/api";
import { ApiFile } from "../../services/api/types";
import { generatePDFCover } from "../../use-cases/generate-pdf-cover";
import {
  PaymentPlanId,
  useGetSubscriptionProducts,
} from "../../use-cases/get-subscription-products";
import { getTrialFormattedPrice, getAnnualFormattedPrice, getCurrency } from "../../utils/helpers";
import check from "./assets/check.svg";
import cross from "./assets/cross.svg";
import { useRouter } from "next/router";
import { PAGE_LINKS } from "../../types";
import { InternalFileType } from "../../types/internal-file";
import { imagesFormat } from "../../utils/constants";
import { Plan } from "../../types/plan";


export interface IPaymentPageInteractor {
  selectedPlan: PaymentPlanId;
  onSelectPlan: (plan: PaymentPlanId) => void;
  onContinue: (place?: string) => void;

  imagePDF: Blob | null;
  isImageLoading: boolean;
  fileType: string | null;
  fileLink: string | null;
  isEmail: boolean;
  isRemoteConfigLoading: boolean;

  getPlans: (t: (key: string) => string) => Plan[];
  isPlansLoading: boolean;
}

export const usePaymentPageInteractor = (): IPaymentPageInteractor => {
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlanId>(PaymentPlanId.MONTHLY_FULL);
  const [file, setFile] = useState<ApiFile>();
  const [imagePDF, setImagePDF] = useState<Blob | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [fileLink, setFileLink] = useState<string | null>(null);

  const router = useRouter();
  const { products } = useGetSubscriptionProducts();
  const { user } = useUser();
  const { abTests, isRemoteConfigLoading } = useRemoteConfig();

  const onSelectPlan = (plan: PaymentPlanId) => {
        if (selectedPlan === plan) {
      setSelectedPlan(plan);
      onContinue("planTab");
      return;
    }
    setSelectedPlan(plan);
    const product = products?.find((item) => item.name === plan);

    console.log(
      "send event analytic1",
      "productId: ",
      plan,
      "currency: ",
      product?.price?.currency || "USD",
      "value: ",
      (product?.price?.price || 0) / 100
    );
  };

  const onContinue = useCallback((place?: string) => {
    console.log(
      "send event analytic2",
      "place: ",
      place ? place : "button",
      "planName: ",
      selectedPlan
    );
    localStorage.setItem("selectedPlan", selectedPlan);

    router.push({ pathname: `${PAGE_LINKS.PAYMENT}`, query: router.query });
  }, []);

  const checkUserSubscription = useCallback(() => {
    if (user?.subscription !== null) {
      router.push(`${PAGE_LINKS.DASHBOARD}`);
    }

    if (!user?.email) {
      router.back();
      return;
    }

    if (router.query?.token) {
      API.auth.byEmailToken(router.query.token as string);
    }
  }, [user?.subscription, user?.email, router.query?.token])

  useEffect(() => {
    checkUserSubscription();
  }, [checkUserSubscription]);

  // @NOTE: analytics on page rendered
  useEffect(() => {
    if (!localStorage.getItem("select_plan_view")) {
      console.log("send event analytic3");
      localStorage.setItem("select_plan_view", "true");
    }
    return () => {
      localStorage.removeItem("select_plan_view");
    };
  }, []);

  useEffect(() => {
    API.files.getFiles().then((res) => {
      if (router.query?.file) {
        const chosenFile = res.files.find(
          (item) => item.id === router.query?.file
        );
        setFile(chosenFile);
        return;
      }
      setFile(res.files[res.files.length - 1]);
    });
  }, [router.query]);

  // @NOTE: setting pre-select plan for users from remarketing emails
  useEffect(() => {
    if (router.query?.fromEmail === "true") {
      setSelectedPlan(PaymentPlanId.MONTHLY_FULL_SECOND_EMAIL);
      return;
    }
  }, [abTests]);

  const getFileUrl = useCallback(async (fileId: string): Promise<string> => {
    if (router.query?.editedFile === "true") {
      return API.files.editedFile(fileId).then((r) => r.url);
    } else {
      return API.files.downloadFile(fileId).then((r) => r.url);
    }
  }, [router.query?.editedFile]);

  // @NOTE: generating cover for pdf-documents
  const loadPdfCover = useCallback(async (): Promise<void> => {
    if (!file || file.internal_type !== "PDF") {
      return;
    }
    setIsImageLoading(true);

    try {
      const fileUrl = await getFileUrl(router?.query?.file as string || file.id);
      const pdfCover = await generatePDFCover({
        pdfFileUrl: fileUrl,
        width: 640,
      });
      setImagePDF(pdfCover);
    } finally {
      setIsImageLoading(false);
    }
  }, [file, router.query, generatePDFCover, getFileUrl]);

  const loadImageCover = useCallback (async () => {
    if (
      !file ||
      !imagesFormat.includes(file.internal_type) ||
      // @NOTE: this two checks fir filename exists because sometimes OS do not pass file.type correctly
      !imagesFormat.includes(
        file.filename.slice(-3).toUpperCase() as InternalFileType
      ) ||
      !imagesFormat.includes(
        file.filename.slice(-4).toUpperCase() as InternalFileType
      )
    ) {
      return;
    }
    const fileUrl = await getFileUrl(router?.query?.file as string || file.id);
    setFileLink(fileUrl);
  }, [file, router.query, getFileUrl]);

  useEffect(() => {
    loadPdfCover();
    loadImageCover();
  }, [loadPdfCover, loadImageCover]);


  const getPlans = (t: (key: string) => string): Plan[] => {
    return products.map((product) => {
      const trialPrice = getTrialFormattedPrice(product?.price?.trial_price!,product?.price?.currency);
      const annualPrice = getAnnualFormattedPrice(product?.price?.price!,product?.price?.currency);
      const text =  product?.name === PaymentPlanId.MONTHLY ? "payment_page.plans.monthly.text" :
        product?.name === PaymentPlanId.MONTHLY_FULL ? "payment_page.plans.annual.text" : "payment_page.plans.monthly_full.text"
      return {
        id: product?.name as PaymentPlanId,
        title: product?.name === PaymentPlanId.MONTHLY ? t("payment_page.plans.monthly.title") 
        :  product?.name === PaymentPlanId.MONTHLY_FULL ?  t("payment_page.plans.monthly_full.title") 
        : t('payment_page.plans.annual.title'),
        price: product?.name === PaymentPlanId.ANNUAL ? annualPrice : trialPrice,
        fullPrice: product?.name !== PaymentPlanId.ANNUAL ? trialPrice : null,
        formattedCurrency: getCurrency(product?.price?.currency),
        date: product?.name === PaymentPlanId.ANNUAL ? t("payment_page.plans.annual.date") : null,
         //@ts-ignore
        text: t(text, { formattedPrice: trialPrice }),
        bullets: Array.from(Array(8).keys()).map((item) => {
          return {
            imgSrc: product?.name === PaymentPlanId.MONTHLY && (item !== 0 && item !== 1 && item !== 2 ) ? cross : check,
            bullText: <span>{t(`payment_page.plans.bullet${item + 1}`)}</span>
          }
        })
      }
    });
  };

  return {
    selectedPlan,
    onSelectPlan,
    onContinue,
    imagePDF: imagePDF || null,
    isImageLoading,
    fileType: file ? file.internal_type : null,
    fileLink,
    isEmail: router.query?.fromEmail === "true",
    isRemoteConfigLoading,
    isPlansLoading: products.length === 0,
    getPlans,
  };
};
