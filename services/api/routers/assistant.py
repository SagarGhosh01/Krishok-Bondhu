"""
AgriShield AI - 'Krishi Mitra' Multilingual AI Agronomy Assistant Router
Provides conversational agronomic guidance grounded in verified ICAR extension advisories.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
import re

router = APIRouter(prefix="/assistant", tags=["Assistant"])


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    language: str = Field("en", pattern="^(en|bn|hi)$")
    disease_context: Optional[str] = None
    severity_grade: Optional[int] = None


class ChatResponse(BaseModel):
    reply: str
    audio_text: str
    key_takeaways: List[str]
    suggested_questions: List[str]
    disclaimer: str


# Rule-governed ICAR knowledge bases for the 3 target languages
KNOWLEDGE_RESPONSES = {
    "en": {
        "organic": (
            "For eco-friendly bio-control: Apply cold-pressed Neem seed kernel extract (5% NSKE) or bio-fungicide "
            "Trichoderma viride @ 4-5 g/liter of water in the evening. For bacterial issues, spray Pseudomonas fluorescens "
            "@ 5 g/liter. Always maintain good soil organic matter."
        ),
        "irrigation": (
            "Irrigate through root drip lines early in the morning. Avoid overhead sprinkler irrigation as splashing water "
            "and prolonged leaf wetness accelerate fungal spore germination."
        ),
        "chemical": (
            "Chemical fungicide applications must strictly follow State Agricultural University & ICAR guidelines. "
            "Standard protective options like Mancozeb 75% WP @ 2.0-2.5 g/liter or Copper Oxychloride 50% WP @ 2.5-3.0 g/liter "
            "may be used as preventive sprays. Consult your local Krishi Vigyan Kendra (KVK) for approval before spraying."
        ),
        "pruning": (
            "Prune infected lower foliage up to 25 cm from the soil level. Disinfect pruning shears with 10% sodium hypochlorite "
            "solution between plants, and bury or burn the diseased debris away from cultivation fields."
        ),
        "general": (
            "Based on ICAR guidelines, successful foliar disease management requires integrated pest management: "
            "certified disease-free seeds, balanced NPK fertilizer (avoid excess nitrogen which softens foliage), and timely biological sprays."
        )
    },
    "bn": {
        "organic": (
            "জৈব নিয়ন্ত্রণের জন্য: নিম বীজের নির্যাস (৫% NSKE) অথবা ট্রাইকোডার্মা ভিরিডি (Trichoderma viride) প্রতি লিটার জলে ৪-৫ গ্রাম "
            "মিশিয়ে বিকেলে স্প্রে করুন। ব্যাকটেরিয়াজনিত সমস্যার ক্ষেত্রে সিউডোমোনাস ফ্লুরোসেন্স ব্যবহার করা যেতে পারে।"
        ),
        "irrigation": (
            "সকালবেলা ড্রিপ পদ্ধতিতে গোড়ায় জল দিন। পাতার ওপর জল ছিটানো বন্ধ রাখুন, কারণ ভিজে পাতায় ছত্রাকের জীবাণু দ্রুত ছড়িয়ে পড়ে।"
        ),
        "chemical": (
            "রাসায়নিক ছত্রাকনাশক ব্যবহারের ক্ষেত্রে রাজ্য কৃষি বিশ্ববিদ্যালয় এবং ICAR-এর নির্দেশিকা মানা জরুরি। "
            "প্রতিরোধমূলক ব্যবস্থা হিসেবে ম্যানকোজেব (Mancozeb 75% WP) প্রতি লিটার জলে ২-২.৫ গ্রাম প্রয়োগ করা যেতে পারে। "
            "সঠিক মাত্রার জন্য নিকটস্থ কৃষি বিজ্ঞান কেন্দ্র (KVK)-এর কৃষি আধিকারিকের সাথে যোগাযোগ করুন।"
        ),
        "pruning": (
            "মাটির কাছ থেকে ২৫ সেমি পর্যন্ত আক্রান্ত নিচের পাতা কেটে ফেলে দিন। কাটা পাতা মাঠে ফেলে না রেখে পুড়িয়ে বা মাটিতে পুঁতে ফেলুন।"
        ),
        "general": (
            "ICAR-এর পরামর্শ অনুযায়ী সমন্বিত রোগ নিয়ন্ত্রণ ব্যবস্থা গ্রহণ করুন: রোগমুক্ত প্রত্যয়িত বীজ ব্যবহার করুন এবং জমিতে অতিরিক্ত নাইট্রোজেন সার দেওয়া বন্ধ রাখুন।"
        )
    },
    "hi": {
        "organic": (
            "जैविक नियंत्रण हेतु: नीम के बीज का अर्क (5% NSKE) या ट्राइकोडर्मा विरिडी (Trichoderma viride) 4-5 ग्राम प्रति लीटर पानी में मिलाकर "
            "शाम के समय छिड़काव करें। जीवाणु जनित रोगों के लिए स्यूडोमोनास फ्लोरेसेंस 5 ग्राम प्रति लीटर उपयोगी है।"
        ),
        "irrigation": (
            "सुबह के समय ड्रिप विधि से जड़ों में सिंचाई करें। पत्तियों पर फव्वारे से पानी देने से बचें क्योंकि पत्तियां गीली रहने पर फफूंद तेजी से फैलती है।"
        ),
        "chemical": (
            "रासायनिक फफूंदनाशकों का उपयोग केवल प्रमाणित आईसीएआर (ICAR) दिशा-निर्देशों के अनुसार करें। "
            "बचाव के लिए मैंकोजेब (Mancozeb 75% WP) 2 से 2.5 ग्राम प्रति लीटर पानी का छिड़काव किया जा सकता है। "
            "छिड़काव से पहले अपने नजदीकी कृषि विज्ञान केंद्र (KVK) के कृषि अधिकारी से सलाह अवश्य लें।"
        ),
        "pruning": (
            "पौधे के निचले 20-25 सेमी के रोगग्रस्त पत्तों को काटकर नष्ट कर दें। उपयोग किए गए उपकरणों को साफ रखें और संक्रमित पत्तों को खेत से दूर जलाएं या गाड़ दें।"
        ),
        "general": (
            "आईसीएआर दिशानिर्देशों के अनुसार एकीकृत रोग प्रबंधन (IPM) अपनाएं: प्रमाणित बीजों का चयन करें तथा आवश्यकता से अधिक यूरिया/नाइट्रोजन देने से बचें।"
        )
    }
}


@router.post("/chat", response_model=ChatResponse)
async def chat_with_krishi_mitra(req: ChatRequest):
    """
    Multilingual conversational endpoint providing ICAR-aligned responses.
    """
    lang = req.language if req.language in KNOWLEDGE_RESPONSES else "en"
    msg_lower = req.message.lower()
    kb = KNOWLEDGE_RESPONSES[lang]

    # Keyword categorization
    if any(w in msg_lower for w in ["organic", "neem", "bio", "trichoderma", "जैविक", "জৈব", "প্রাকৃতিক"]):
        reply = kb["organic"]
        takeaways = [
            "Use 5% NSKE or Trichoderma viride in the late evening",
            "Maintain soil organic carbon and beneficial microbes",
            "Avoid hot mid-day biological applications"
        ]
    elif any(w in msg_lower for w in ["water", "irrigation", "rain", "পানি", "জল", "সেচ", "सिंचाई", "पानी"]):
        reply = kb["irrigation"]
        takeaways = [
            "Irrigate morning hours via root drip lines",
            "Zero overhead wetting of foliar canopies",
            "Ensure proper field furrow drainage"
        ]
    elif any(w in msg_lower for w in ["spray", "chemical", "fungicide", "medicine", "কীটনাশক", "ওষুধ", "दवा", "कीटनाशक", "छिड़काव"]):
        reply = kb["chemical"]
        takeaways = [
            "Observe mandatory pre-harvest safety interval",
            "Wear protective masks and gloves during spraying",
            "Consult local Krishi Vigyan Kendra (KVK) officer"
        ]
    elif any(w in msg_lower for w in ["cut", "prun", "leaf", "remove", "ছাঁটাই", "কাটা", "পাতা", "कटाई", "पत्ती"]):
        reply = kb["pruning"]
        takeaways = [
            "Prune infected foliage below 25 cm canopy line",
            "Disinfect hand tools with 10% bleach",
            "Bury or burn pruned crop debris off-site"
        ]
    else:
        # Context-rich synthesis
        ctx_prefix = f"Regarding {req.disease_context}: " if req.disease_context else ""
        reply = ctx_prefix + kb["general"]
        takeaways = [
            "Practice balanced fertilizer application (avoid excess N)",
            "Scout canopy twice weekly for early lesion spotting",
            "Follow certified seed treatment practices"
        ]

    # Suggested follow-ups
    if lang == "bn":
        suggested = [
            "জৈব পদ্ধতিতে কীভাবে প্রতিকার করব?",
            "কীভাবে সঠিক সেচ দেব?",
            "কাটা পাতা কীভাবে ধ্বংস করব?"
        ]
        disclaimer = "সতর্কতা: রাসায়নিক স্প্রে করার পূর্বে স্থানীয় কৃষি বিজ্ঞান কেন্দ্র (KVK) থেকে পরামর্শ নিন।"
    elif lang == "hi":
        suggested = [
            "जैविक उपचार की सही विधि क्या है?",
            "सिंचाई का सही समय क्या होना चाहिए?",
            "संक्रमित पत्तियों को कैसे हटाएं?"
        ]
        disclaimer = "चेतावनी: रासायनिक छिड़काव से पहले नजदीकी कृषि विज्ञान केंद्र (KVK) से परामर्श करें।"
    else:
        suggested = [
            "What biological formulation should I apply?",
            "How should I manage canopy irrigation?",
            "How do I prune infected foliar spots?"
        ]
        disclaimer = "Caution: Consult your local Krishi Vigyan Kendra (KVK) before applying chemical active ingredients."

    # Audio text: strip markdown/special chars for smooth speech synthesis
    clean_audio = re.sub(r"[*_#\[\]()@]", "", reply)

    return ChatResponse(
        reply=reply,
        audio_text=clean_audio,
        key_takeaways=takeaways,
        suggested_questions=suggested,
        disclaimer=disclaimer
    )
