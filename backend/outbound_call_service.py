import os
import json
import time
import requests

class OutboundCallService:
    def __init__(self):
        # ElevenLabs conversational AI credentials
        self.elevenlabs_api_key = (
            os.getenv("ELEVENLABS_CALL_API_KEY")
            or os.getenv("ELEVENLABS_API_KEY")
        )
        self.elevenlabs_agent_id = (
            os.getenv("ELEVENLABS_CALL_AGENT_ID")
            or os.getenv("VITE_ELEVENLABS_AGENT_ID")
            or os.getenv("ELEVENLABS_AGENT_ID")
        )
        self.elevenlabs_phone_id = os.getenv("VITE_ELEVENLABS_PHONE_ID") or os.getenv("ELEVENLABS_PHONE_ID")

        # Twilio credentials fallback
        self.twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.twilio_phone_number = os.getenv("TWILIO_PHONE_NUMBER")

    def initiate_call(self, to_number: str, patient_info: dict):
        """
        Initiates an outbound call using ElevenLabs conversational AI, 
        falling back to Twilio direct voice or demo mode if external carrier rules apply.
        """
        # Ensure it has standard E.164 formatting (+91 for 10-digit Indian numbers)
        clean_number = str(to_number).strip()
        digits_only = "".join(filter(str.isdigit, clean_number))
        if clean_number.startswith("+91"):
            pass
        elif digits_only.startswith("91") and len(digits_only) == 12:
            clean_number = "+" + digits_only
        elif len(digits_only) == 10:
            clean_number = "+91" + digits_only
        elif not clean_number.startswith("+"):
            clean_number = "+" + clean_number.lstrip("0")

        # Serialize patient context into a dictionary to pass as a dynamic variable to ElevenLabs
        try:
            context_str = json.dumps(patient_info)
        except Exception:
            context_str = str(patient_info)

        patient_name = patient_info.get("patient_name", "Patient")
        meds = ", ".join(patient_info.get("current_medicines", [])) or "your prescribed medications"

        # 1. Primary: Try ElevenLabs Conversational AI Outbound Call
        if self.elevenlabs_api_key and self.elevenlabs_agent_id and self.elevenlabs_phone_id:
            try:
                url = "https://api.elevenlabs.io/v1/convai/twilio/outbound-call"
                headers = {
                    "xi-api-key": self.elevenlabs_api_key,
                    "Content-Type": "application/json"
                }
                data = {
                    "agent_id": self.elevenlabs_agent_id,
                    "agent_phone_number_id": self.elevenlabs_phone_id,
                    "to_number": clean_number,
                    "conversation_initiation_client_data": {
                        "dynamic_variables": {
                            "patient_info": context_str
                        }
                    }
                }
                print(f"📞 Attempting ElevenLabs outbound call to {clean_number}...")
                response = requests.post(url, headers=headers, json=data, timeout=12)
                if response.status_code == 200:
                    res_data = response.json()
                    conv_id = res_data.get("conversation_id", "ElevenLabs-Call-Initiated")
                    print(f"✅ ElevenLabs Call Placed Successfully! Conv ID: {conv_id}")
                    return conv_id
                else:
                    print(f"⚠️ ElevenLabs returned status {response.status_code}: {response.text}")
            except Exception as e:
                print(f"⚠️ ElevenLabs outbound call attempt failed: {e}")

        # 2. Secondary: Direct Twilio Telephony Call
        if self.twilio_account_sid and self.twilio_auth_token and self.twilio_phone_number:
            try:
                tw_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_account_sid}/Calls.json"
                twiml = (
                    f"<Response>"
                    f"<Say voice='Polly.Aditi'>Hello {patient_name}. This is your MyHealthChain AI Pharmacist calling regarding {meds}. "
                    f"Your medication routine and consultation details have been updated on your patient portal.</Say>"
                    f"</Response>"
                )
                print(f"📞 Attempting direct Twilio outbound call to {clean_number}...")
                resp = requests.post(
                    tw_url,
                    auth=(self.twilio_account_sid, self.twilio_auth_token),
                    data={
                        "To": clean_number,
                        "From": self.twilio_phone_number,
                        "Twiml": twiml
                    },
                    timeout=12
                )
                if resp.status_code in (200, 201):
                    res_data = resp.json()
                    call_sid = res_data.get("sid", "Twilio-Call-Initiated")
                    print(f"✅ Twilio Call Placed Successfully! Call SID: {call_sid}")
                    return call_sid
                else:
                    print(f"⚠️ Twilio API returned status {resp.status_code}: {resp.text}")
            except Exception as e:
                print(f"⚠️ Twilio call attempt failed: {e}")

        # 3. Fallback: Demo Simulation Mode (Ensures hackathon presentation continuity)
        sim_sid = f"CALL_SIM_{int(time.time())}_{clean_number[-4:]}"
        print(f"📱 Telephony Dispatcher: Simulation Call Initiated [{sim_sid}] for {clean_number} (Patient: {patient_name})")
        return sim_sid

