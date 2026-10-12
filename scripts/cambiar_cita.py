
import xmlrpc.client
import sys
import os
import json

# ==========================================
# CONFIGURACIÓN
# ==========================================

URL = "https://odoo.healthectecsalud.mx"
DB = "finmedica1"
USERNAME = "esalinas@healthec.mx"

# Lista permitida: ajustar a los valores
# reales del campo state en appointment.slot
ESTADOS_PERMITIDOS = {"pending"}

def responder(ok, mensaje, **datos):
    print(json.dumps({
        "ok": ok,
        "mensaje": mensaje,
        **datos
    }, ensure_ascii=False))
    sys.exit(0 if ok else 1)

def main():
    if len(sys.argv) != 3:
        responder(False, "Uso: cambiar_cita.py ID ESTADO")

    try:
        id_cita = int(sys.argv[1])
        nuevo_estado = sys.argv[2].strip().lower()

        if id_cita <= 0:
            raise ValueError()

    except ValueError:
        responder(False, "El ID de la cita debe ser positivo.")

    if nuevo_estado not in ESTADOS_PERMITIDOS:
        responder(False, "Estado no permitido.")

    password = os.getenv("ODOO_PASSWORD")

    if not password:
        responder(False, "Falta ODOO_PASSWORD.")

    try:
        common = xmlrpc.client.ServerProxy(
            f"{URL}/xmlrpc/2/common",
            allow_none=True
        )

        uid = common.authenticate(
            DB, USERNAME, password, {}
        )

        if not uid:
            responder(False, "Error de autenticación en Odoo.")

        models = xmlrpc.client.ServerProxy(
            f"{URL}/xmlrpc/2/object",
            allow_none=True
        )

        citas = models.execute_kw(
            DB, uid, password,
            "appointment.slot",
            "search_read",
            [[("id", "=", id_cita)]],
            {
                "fields": [
                    "id",
                    "patient_id",
                    "doctor_id",
                    "start_datetime",
                    "state"
                ],
                "limit": 1
            }
        )

        if not citas:
            responder(False, f"No existe la cita {id_cita}.")

        cita = citas[0]
        estado_anterior = cita.get("state")

        if estado_anterior == nuevo_estado:
            responder(
                True,
                "La cita ya tiene el estado solicitado.",
                id_cita=id_cita,
                estado_anterior=estado_anterior,
                estado_nuevo=nuevo_estado
            )

        resultado = models.execute_kw(
            DB, uid, password,
            "appointment.slot",
            "write",
            [
                [id_cita],
                {"state": nuevo_estado}
            ]
        )

        if not resultado:
            responder(False, "Odoo no confirmó la actualización.")

        verificacion = models.execute_kw(
            DB, uid, password,
            "appointment.slot",
            "read",
            [[id_cita]],
            {"fields": ["state"]}
        )

        estado_final = (
            verificacion[0].get("state")
            if verificacion else None
        )

        if estado_final != nuevo_estado:
            responder(
                False,
                "El estado final no coincide con el solicitado."
            )

        responder(
            True,
            "Estado actualizado correctamente.",
            id_cita=id_cita,
            estado_anterior=estado_anterior,
            estado_nuevo=estado_final,
            paciente=cita.get("patient_id"),
            doctor=cita.get("doctor_id"),
            fecha=cita.get("start_datetime")
        )

    except Exception as error:
        # No devolver excepciones completas al chat,
        # ya que pueden contener datos internos.
        print(f"Error interno: {type(error).__name__}", file=sys.stderr)
        responder(False, "Error al consultar o actualizar Odoo.")

if __name__ == "__main__":
    main()
