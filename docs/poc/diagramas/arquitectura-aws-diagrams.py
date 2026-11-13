"""
Arquitectura AWS de bajo costo - PoC "Revisor inteligente de solicitudes" (OrigenTours).

Stack: React (frontend) + Node.js/Express (backend) + PostgreSQL con JSONB + OpenAI API.

Requisitos:
    pip install diagrams
    Graphviz instalado en el sistema (brew install graphviz / apt install graphviz)

Uso:
    python arquitectura_poc_origentours.py   ->   genera arquitectura_poc_origentours.png
"""
from diagrams import Cluster, Diagram, Edge
from diagrams.aws.database import RDS
from diagrams.aws.compute import EC2
from diagrams.aws.management import Cloudwatch
from diagrams.aws.network import CloudFront, InternetGateway
from diagrams.aws.security import IAMRole, SecretsManager
from diagrams.aws.storage import S3
from diagrams.onprem.client import User
from diagrams.onprem.network import Internet

graph_attr = {"fontsize": "20", "pad": "0.5", "splines": "spline"}

with Diagram(
    "PoC OrigenTours - Arquitectura AWS (bajo costo)",
    filename="arquitectura_poc_origentours",
    show=False,
    direction="LR",
    graph_attr=graph_attr,
):
    asesor = User("Asesor\n(navegador)")

    with Cluster("AWS Cloud"):
        # --- Publicación del frontend y entrada única por HTTPS ---
        cdn = CloudFront("CloudFront\n(HTTPS, un solo dominio)")
        web = S3("S3 privado\nReact build (estático)")

        # --- Red: una VPC simple, sin NAT Gateway para ahorrar costo ---
        with Cluster("VPC"):
            igw = InternetGateway("Internet Gateway")

            with Cluster("Subred pública"):
                backend = EC2("EC2 t4g.small\nExpress (Node.js)\nDocker / PM2")

            with Cluster("Subredes privadas (sin salida a internet)"):
                db = RDS("RDS PostgreSQL\ndb.t4g.micro\n(JSONB)")

        # --- Seguridad y observabilidad ---
        rol = IAMRole("IAM Role\n(instance profile)")
        secretos = SecretsManager("Secrets Manager\nOPENAI_API_KEY")
        logs = Cloudwatch("CloudWatch\nlogs y alarmas")

    openai = Internet("API OpenAI\n(externa, HTTPS)")

    # Frontend: el navegador entra por CloudFront
    asesor >> Edge(label="HTTPS") >> cdn
    cdn >> Edge(label="/*  (OAC)") >> web
    cdn >> Edge(label="/api/*") >> backend

    # Backend -> base de datos (solo permitido desde el SG del backend)
    backend >> Edge(label="PostgreSQL 5432\n(SG a SG)") >> db

    # Clave del LLM: nunca en el código, se lee en el arranque con el rol
    backend >> Edge(style="dashed", label="asume rol") >> rol
    rol >> Edge(style="dashed", label="GetSecretValue") >> secretos

    # Salida hacia OpenAI por el Internet Gateway
    backend >> Edge(label="HTTPS saliente") >> igw >> openai

    # Observabilidad
    backend >> Edge(style="dotted", label="logs") >> logs
    db >> Edge(style="dotted") >> logs
