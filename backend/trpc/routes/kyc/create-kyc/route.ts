import { protectedProcedure } from "../../../create-context";
import { z } from "zod";

export const createKycProcedure = protectedProcedure
  .input(
    z.object({
      fullName: z.string().min(1),
      nationalId: z.string().min(1),
      birthDate: z.string(), // ISO date string
      country: z.string().optional(),
      city: z.string().optional(),
      email: z.string().email().optional(),
      documents: z.array(
        z.object({
          type: z.enum(["id_front", "id_back", "selfie", "selfie_with_id"]),
          fileUrl: z.string().url(),
        })
      ),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    // Kullanıcının pending başvurusu var mı kontrol et
    const { data: existingRequest } = await supabase
      .from("kyc_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();
    
    if (existingRequest) {
      throw new Error("Zaten bekleyen bir kimlik doğrulama başvurunuz var");
    }
    
    // Verification code oluştur (selfie + kimlik fotoğrafı için)
    const today = new Date();
    const dateStr = today.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const randomCode = Math.floor(1000 + Math.random() * 9000); // 1000-9999 arası
    const verificationCode = `MYTRABZON – ${dateStr} – KOD: ${randomCode}`;
    
    // KYC request oluştur
    const { data: kycRequest, error: kycError } = await supabase
      .from("kyc_requests")
      .insert({
        user_id: user.id,
        status: "pending",
        full_name: input.fullName,
        national_id: input.nationalId,
        birth_date: input.birthDate,
        country: input.country,
        city: input.city,
        email: input.email,
        verification_code: verificationCode,
        code_generated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (kycError) throw new Error(kycError.message);
    
    // Documents ekle
    const documents = input.documents.map((doc) => ({
      kyc_id: kycRequest.id,
      type: doc.type,
      file_url: doc.fileUrl,
    }));
    
    const { error: docsError } = await supabase
      .from("kyc_documents")
      .insert(documents);
    
    if (docsError) throw new Error(docsError.message);
    
    return {
      success: true,
      kycId: kycRequest.id,
      verificationCode,
    };
  });

