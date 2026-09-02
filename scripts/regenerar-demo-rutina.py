#!/usr/bin/env python3
"""Rehace la demo embebida de rutina-export, en castellano y en inglés.

La demo NO es una imitación: es el dashboard de verdad del proyecto, generado
con `tests/dashboard_de_ejemplo.py` del propio repositorio, que fabrica un
historial inventado con una tendencia y ruido. Así lo que se enseña es
exactamente lo que produce la canalización.

La versión inglesa se hace traduciendo el HTML generado, no la plantilla: la
plantilla es del proyecto rutina y está en castellano a propósito. La tabla de
abajo es esa traducción, y vive aquí porque hay que repasarla cada vez que el
dashboard cambia; la primera vez se hizo a mano y se perdió, y rehacerla costó
más que escribirla.

    python3 scripts/regenerar-demo-rutina.py [--proyecto ../rutina-export]

Comprueba al final que no quede castellano suelto en la copia inglesa: si algo
falta en la tabla, lo dice y sale con error en vez de publicar una demo a medias.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
SALIDA = RAIZ / "public" / "demo" / "rutina-export"

# El aviso que corona la demo. No lo pone el dashboard: es de aquí, porque aquí
# es donde la página se enseña a desconocidos y hay que decirles de dónde salen
# los números antes de que se los crean.
AVISO = """<div style="background:#3a2a00;color:#ffd479;padding:10px 16px;\
font:14px/1.4 system-ui,sans-serif;text-align:center;border-bottom:1px solid #5a4200">
<b>{titulo}</b> {texto}
<a href="https://github.com/FlorinTodor/rutina-export" target="_blank" \
rel="noopener" style="color:#ffd479">{enlace}</a>
</div>
"""

AVISO_ES = dict(
    titulo="Demo con datos inventados.",
    texto="Ninguna cifra procede de un dispositivo ni de una persona real: se "
          "generan con una tendencia y ruido para enseñar qué produce la canalización.",
    enlace="Código en GitHub")
AVISO_EN = dict(
    titulo="Demo with made-up data.",
    texto="No figure comes from a real device or person: they are generated from "
          "a trend plus noise to show what the pipeline produces.",
    enlace="Code on GitHub")

# Traducción del HTML generado. Cada entrada es un trozo literal del fichero;
# se aplican de más larga a más corta para que "Volumen semanal" no acabe en
# "Weekly Volumen". Las frases que ocupan dos líneas van partidas por líneas,
# que es como aparecen en el fuente.
TRADUCCION = [
    # --- cabecera y navegación ---
    ("Sala de Máquinas", "Machine Room"),
    ("Resumen", "Overview"),
    ("Fuerza", "Strength"),
    ("Actividad", "Activity"),
    ("Cuerpo", "Body"),
    ("Buscar ejercicio…", "Search exercise…"),
    ("Buscar ejercicio", "Search exercise"),
    ("Ordenar por", "Sort by"),
    ("Más reciente primero", "Most recent first"),
    ("Más volumen", "Most volume"),
    ("Mejor progresión", "Best progression"),
    ("Más estancado", "Most stalled"),
    ("Alfabético", "Alphabetical"),
    ("Ejercicios", "Exercises"),
    ("Cerrar", "Close"),
    ("sesiones", "sessions"),
    ("movidas", "moved"),
    ("ejercicios", "exercises"),
    ("Nada coincide.", "Nothing matches."),
    ("Ampliar", "Expand"),

    # --- ficha de ejercicio ---
    ("Solo una sesión registrada: aún no hay curva.",
     "Only one session recorded: no curve yet."),
    ("Sin 1RM estimado: hace falta peso en la barra y series de 12 repeticiones o menos.",
     "No estimated 1RM: that needs weight on the bar and sets of 12 reps or fewer."),
    ("Progresión de 1RM estimado en", "Estimated 1RM progression for"),
    ("1RM estimado por sesión (Epley). El punto en latón es tu récord.",
     "Estimated 1RM per session (Epley). The brass dot is your record."),
    ("1RM estimado por sesión (Epley)", "Estimated 1RM per session (Epley)"),
    ("1RM estimado por sesión", "Estimated 1RM per session"),
    ("Demostración de", "Demonstration of"),
    ("PR reciente", "Recent PR"),
    ("Récord 1RM est.", "Est. 1RM record"),
    ("Serie más pesada", "Heaviest set"),
    ("Mejor serie", "Best set"),
    ("Tendencia del peso", "Weight trend"),
    ("Tendencia", "Trend"),
    ("Sesiones", "Sessions"),
    ("Volumen total", "Total volume"),
    ("Desde la última", "Since the last one"),
    ("Desde el récord", "Since the record"),
    ("Siguiente objetivo", "Next target"),
    ("Doble progresión: la", "Double progression: the"),
    ("última vez hiciste", "last time you did"),
    (", así que toca", ", so now it's"),
    ("la misma carga y", "the same load and"),
    ("una repetición más", "one more rep"),
    ("subir a", "going up to"),
    ("y volver a 8 repeticiones", "and back down to 8 reps"),
    (". Es una", ". It is a"),
    ("orientación calculada, no lo que diga tu sensación del día.",
     "calculated guide, not what the day feels like."),
    ("También registrado como:", "Also recorded as:"),

    # --- las gráficas de la sesión y el glosario ---
    ("La carga de cada día", "Each day's load"),
    ("La curva de arriba dice lo fuerte que estás; estas dicen lo",
     "The curve above says how strong you are; these say what"),
    ("que hiciste. Dos sesiones con el mismo 1RM estimado pueden ser dos series",
     "you did. Two sessions with the same estimated 1RM can be two working sets"),
    ("o cinco.", "or five."),
    ("Este ejercicio no lleva peso, así que no hay 1RM que estimar: la",
     "This exercise carries no weight, so there is no 1RM to estimate: the"),
    ("carga se cuenta en ", "load is counted in "),
    (" En ", " In "),
    (" de las ", " of the "),
    ("sesiones no hay 1RM estimado porque", "sessions there is no estimated 1RM because"),
    ("ninguna serie bajó de 12 repeticiones: la carga sí está, el 1RM no.",
     "no set went below 12 reps: the load is there, the 1RM isn't."),
    ("Carga de la sesión", "Session load"),
    ("Kilos movidos ese día: peso × repeticiones de todas las series",
     "Kilos moved that day: weight × reps across every set"),
    ("Peso × repeticiones sumado en todas las series efectivas",
     "Weight × reps summed across every working set"),
    ("Repeticiones de la sesión", "Session reps"),
    ("Este ejercicio no lleva peso, así que la carga se cuenta en repeticiones",
     "This exercise carries no weight, so the load is counted in reps"),
    ("Repeticiones efectivas del día, sin contar calentamientos",
     "Working reps of the day, warm-ups aside"),
    ("Minutos por sesión", "Minutes per session"),
    ("Este ejercicio se registra por tiempo: ni kilos ni repeticiones",
     "This exercise is logged by time: no kilos, no reps"),
    ("Minutos registrados en Hevy", "Minutes logged in Hevy"),
    ("Peso de la mejor serie", "Weight of the best set"),
    ("El disco que moviste, con las repeticiones encima de la barra",
     "The plate you moved, with the reps above each bar"),
    ("La mejor serie de cada sesión: peso, y encima las repeticiones",
     "The best set of each session: weight, with the reps above"),
    ("la mejor serie de esa sesión", "the best set of that session"),
    ("tu serie más pesada", "your heaviest set"),
    ("Series por sesión", "Sets per session"),
    ("Series efectivas, sin contar calentamientos. Es lo que cuenta el reparto por músculo",
     "Working sets, warm-ups aside. This is what the per-muscle split counts"),
    ("Series efectivas por sesión", "Working sets per session"),
    ("Récords", "Records"),
    ("Lo de cada día contra el mejor 1RM que llevabas hasta esa fecha",
     "Each day against the best 1RM you had up to that date"),
    ("La línea de latón solo sube: cuando se aplana, el récord lleva tiempo sin caer",
     "The brass line only goes up: when it flattens, the record hasn't fallen in a while"),
    ("Hace falta más de una sesión con 1RM estimado.",
     "That needs more than one session with an estimated 1RM."),
    ("Récord acumulado", "Running record"),
    ("1RM del día", "1RM of the day"),
    ("récord vigente", "standing record"),
    ("récords en", "records in"),
    ("sesiones medidas", "measured sessions"),
    ("primera sesión medida: la línea de salida", "first measured session: the starting line"),
    ("nuevo récord, +", "new record, +"),
    ("récord ", "record "),
    (" kg, sin moverse desde hace ", " kg, unmoved for "),

    ("Qué es un PR, qué es el 1RM y qué es el volumen",
     "What a PR is, what the 1RM is and what volume is"),
    ("Serie</dt>", "Set</dt>"),
    ("son 70 kg levantados 10 veces seguidas. Los",
     "is 70 kg lifted 10 times in a row. Warm-ups"),
    ("calentamientos no entran en ningún número de esta página.",
     "are left out of every number on this page."),
    ("Volumen — la carga del día", "Volume — the day's load"),
    ("Peso × repeticiones, sumado en todas las series. Es cuánto has movido",
     "Weight × reps, summed across every set. It is how much you moved"),
    ("en total, y sube cuando haces más trabajo aunque no toques más peso.",
     "in total, and it goes up when you do more work even at the same weight."),
    ("El peso máximo que podrías levantar", "The most weight you could lift"),
    ("<b>una sola vez</b>", "<b>a single time</b>"),
    (". Aquí nunca se", ". Here it is never"),
    ("mide: se", "measured: it is"),
    ("<b>estima</b>", "<b>estimated</b>"),
    ("con la fórmula de Epley", "with the Epley formula"),
    ("a partir de tu mejor serie real. Por", "from your best real set. That is why"),
    ("eso pone «1RM est.». Por encima de 12 repeticiones la fórmula deja de ser",
     "it says «est. 1RM». Above 12 reps the formula stops being"),
    ("fiable y la casilla se queda vacía.", "reliable and the cell is left blank."),
    ("PR — récord personal", "PR — personal record"),
    ("Lo mejor que has hecho", "The best you have actually done"),
    ("<b>de verdad</b>", "<b>for real</b>"),
    (", y hay más de uno. El de peso es", ", and there is more than one. The weight one is"),
    ("la serie más pesada", "the heaviest set"),
    (": la tuya es", ": yours is"),
    ("El de fuerza es el", "The strength one is the"),
    ("mayor 1RM estimado", "highest estimated 1RM"),
    ("No cayeron el mismo día, y por eso van por separado.",
     "They didn't fall on the same day, which is why they are kept apart."),
    ("La diferencia, en una línea", "The difference, in one line"),
    ("El PR es un hecho; el 1RM es una cuenta hecha a partir de ese hecho. Y",
     "A PR is a fact; the 1RM is arithmetic done on top of that fact. And"),
    ("un PR puede caer sin tocar más peso:", "a PR can fall without touching more weight:"),
    ("es más que", "is more than"),
    ("con el mismo disco.", "with the same plate."),
]

TRADUCCION += [
    # --- tabla de sesiones ---
    ("Fecha</th><th>1RM est.</th><th>Mejor serie</th><th>Series</th>",
     "Date</th><th>Est. 1RM</th><th>Best set</th><th>Sets</th>"),
    ("<th>Reps</th><th>Volumen</th>", "<th>Reps</th><th>Volume</th>"),

    # --- gráficas compartidas ---
    ("Aún no hay datos suficientes.", "Not enough data yet."),
    ("Aún no hay datos.", "No data yet."),
    ("Sin entrenos suficientes.", "Not enough workouts yet."),
    ("Sin entrenos.", "No workouts."),
    ("media ${win} días", "${win}-day average"),
    ("diario</span>", "daily</span>"),
    ("Días entrenados", "Days trained"),
    ("días entrenados · el color es el volumen", "days trained · colour is volume"),
    ("Descanso", "Rest"),

    # --- visor ampliado ---
    ("Mínimo", "Min"),
    ("Máximo", "Max"),
    ("Media", "Average"),
    ("Cambio total", "Total change"),
    ("Registros", "Data points"),
    ("Actual", "Current"),

    # --- actividad ---
    ("Constancia", "Consistency"),
    ("Cada cuadro es un día; el color, el volumen", "Each square is a day; colour is volume"),
    ("Cada cuadro es un día", "Each square is a day"),
    ("Volumen semanal", "Weekly volume"),
    ("Toneladas levantadas por semana", "Tonnes lifted per week"),
    ("Pasos diarios", "Daily steps"),
    ("Pasos", "Steps"),
    ("km el último día con dato", "km on the last day with data"),
    ("Distancia (km)", "Distance (km)"),
    ("Distancia", "Distance"),
    ("Kilómetros al día, de Health Connect", "Kilometres per day, from Health Connect"),
    ("Health Connect · media móvil de 7 días", "Health Connect · 7-day moving average"),
    ("Sueño", "Sleep"),
    ("Fases por noche, sin contar el tiempo despierto", "Stages per night, awake time aside"),
    ("eficiencia media", "average efficiency"),
    ("Fases del sueño", "Sleep stages"),
    ("profundo", "deep"),
    ("ligero", "light"),
    ("Pulso medio y máximo del día", "Average and peak heart rate of the day"),
    ("Medio y máximo del día, de Health Connect",
     "Average and peak of the day, from Health Connect"),
    ("el reposo no lo escribe ninguna app todavía",
     "resting rate is not written by any app yet"),
    ("Pulso", "Heart rate"),
    ("máximo", "peak"),
    ("medio", "average"),

    # --- calorías ---
    ("Calorías quemadas", "Calories burned"),
    ("Total del día según Health Connect · el entreno de Hevy ya va",
     "Day total from Health Connect · the Hevy workout is already"),
    ("incluido, porque Hevy escribe en Health Connect",
     "included, because Hevy writes into Health Connect"),
    ("La <b>basal</b>", "The <b>basal rate</b>"),
    (" kcal, que", " kcal, which"),
    ("estima la báscula según tu composición) es lo que gastarías tumbado todo el",
     "the scale estimates from your composition) is what you'd burn lying down all"),
    ("día sin moverte: respirar, el corazón, la temperatura, los órganos. Todo lo",
     "day: breathing, the heart, temperature, the organs. Everything"),
    ("que quede <b>por encima de la línea</b> es lo que has añadido moviéndote.",
     "<b>above the line</b> is what you added by moving."),
    ("Quedan fuera <b>", "Left out: <b>"),
    ("días</b> en los que", "days</b> in which"),
    ("Samsung no registró actividad y apuntó solo la basal: no son días de quemar",
     "no activity was recorded and only the basal rate was written: not days of burning"),
    ("poco, son días sin dato. Por eso la gráfica empieza en",
     "little, but days with no data. That is why the chart starts on"),
    (" y\n      tiene huecos.", " and\n      has gaps."),
    ("Media 7 días", "7-day average"),
    ("con dato)", "with data)"),
    ("Entrenando (", "Training ("),
    ("Descansando (", "Resting ("),
    ("días)", "days)"),
    ("Lo que suma entrenar", "What training adds"),
    ("Sobre tu basal", "Above your basal rate"),
    ("día en curso", "day in progress"),
    ("Con ${desD.length} días de descanso", "With ${desD.length} rest days"),
    ("con dato completo no se puede comparar todavía contra los ${entD.length} de",
     "with complete data there is nothing to compare yet against the ${entD.length}"),
    ("entreno: hacen falta al menos ${MIN} de cada.",
     "training ones: at least ${MIN} of each are needed."),
    ("Total diario de Health Connect · la línea marca tu metabolismo basal",
     "Daily total from Health Connect · the line marks your basal metabolism"),

    # --- balance energético ---
    ("Balance energético", "Energy balance"),
    ("Cuánto comes de más o de menos, sin pesar comida",
     "How much you over- or under-eat, without weighing food"),
    ("Hacen falta <b>", "It needs <b>"),
    ("pesajes</b> repartidos en", "weigh-ins</b> spread over"),
    ("al menos <b>", "at least <b>"),
    ("días</b> dentro de los últimos", "days</b> within the last"),
    ("ahora hay ${e.pesajes} en ${e.dias}. Pésate en ayunas tres o cuatro días",
     "right now there are ${e.pesajes} in ${e.dias}. Weigh in fasted three or four days"),
    ("por semana y esto se llena solo.", "a week and this fills itself in."),
    ("Estimado con la pendiente del peso entre", "Estimated from the weight slope between"),
    ("pesajes en", "weigh-ins in"),
    ("Balance diario", "Daily balance"),
    ("Gasto medio", "Average burn"),
    ("Ingesta estimada", "Estimated intake"),
    ("Un kilo de grasa son unas 7.700 kcal.", "A kilo of fat is about 7,700 kcal."),
    ("Para mantener el peso tendrías que comer alrededor de",
     "To hold your weight you'd have to eat around"),
    ("por la tendencia, ahora mismo estás en", "by the trend, right now you are"),
    ("torno a", "around"),
    ("En ventanas cortas la báscula mide agua además de grasa, por eso se piden",
     "Over short windows the scale measures water as well as fat, which is why it asks for"),
    ("dos semanas.", "two weeks."),
]

TRADUCCION += [
    # --- cuerpo ---
    ("Sin pesajes todavía.", "No weigh-ins yet."),
    ("Sin pesajes suficientes.", "Not enough weigh-ins."),
    ("Peso (tendencia 7 d)", "Weight (7-day trend)"),
    ("Peso (tendencia)", "Weight (trend)"),
    ("Grasa corporal", "Body fat"),
    ("Masa muscular", "Muscle mass"),
    ("Músculo esquelético", "Skeletal muscle"),
    ("Masa magra estimada", "Estimated lean mass"),
    ("Masa magra", "Lean mass"),
    ("Agua corporal", "Body water"),
    ("Proteína", "Protein"),
    ("Grasa visceral", "Visceral fat"),
    ("Grasa subcutánea", "Subcutaneous fat"),
    ("Masa ósea", "Bone mass"),
    ("Metabolismo basal", "Basal metabolism"),
    ("Edad corporal", "Body age"),
    ("años", "yrs"),
    ("Ahora mismo", "Right now"),
    ("el cambio es frente a hace 30 días", "change is against 30 days ago"),
    ("Evolución de las medidas", "Measurement trend"),
    ("Evolución", "Trend"),
    ("pesajes desde", "weigh-ins since"),
    ("Últimos pesajes", "Latest weigh-ins"),
    ("Último pesaje ·", "Last weigh-in ·"),
    ("La tendencia es la mediana de los pesajes de 7 días: un",
     "The trend is the median of 7 days of weigh-ins: a single"),
    ("pesaje suelto se mueve ~0,6 kg de un día a otro por agua y por la hora",
     "weigh-in moves ~0.6 kg from one day to the next through water and the hour"),
    ("Una casilla vacía es que no había", "An empty cell means there was no"),
    ("pesaje cerca de esa fecha. Antes se cogía el más reciente que hubiera, y",
     "weigh-in near that date. It used to take the most recent one there was, and"),
    ("la columna de 7 días podía estar enseñando el cambio de un mes.",
     "the 7-day column could be showing a month's change."),
    ("No hay pesaje cerca de esa fecha", "No weigh-in near that date"),
    ("días reales", "real days"),
    ("Se usa el abdomen porque la cintura no se ha medido aún. ",
     "The abdomen is used because the waist hasn't been measured yet. "),
    ("Por debajo de <b>0,50</b> es el objetivo de salud habitual; estás en",
     "Below <b>0.50</b> is the usual health target; you are at"),
    ("medidos el", "measured on"),
    ("Altura (de peso e IMC)", "Height (from weight and BMI)"),
    ("Cintura/altura", "Waist/height"),
    ("Abdomen/altura", "Abdomen/height"),
    ("FFMI (máx", "FFMI (max"),

    # --- cinta métrica ---
    ("Cinta métrica", "Tape measure"),
    ("el cambio es frente a la medición anterior,", "change is against the previous measurement,"),
    ("mediciones desde", "measurements since"),
    ("Historial de medidas", "Measurement history"),
    ("Asimetría", "Asymmetry"),
    ("Derecho menos izquierdo, en la última tanda", "Right minus left, in the latest round"),
    ("Por debajo de 1 cm es ruido de medición; por encima, algo que mirar",
     "Under 1 cm is measurement noise; over it, something to look at"),
    (": der − izq", ": right − left"),
    ("Cuello", "Neck"),
    ("Pecho", "Chest"),
    ("Cintura", "Waist"),
    ("Cadera", "Hip"),
    ("Brazo izq.", "Left arm"),
    ("Brazo der.", "Right arm"),
    ("Antebrazo izq.", "Left forearm"),
    ("Antebrazo der.", "Right forearm"),
    ("Muslo izq.", "Left thigh"),
    ("Muslo der.", "Right thigh"),
    ("Gemelo izq.", "Left calf"),
    ("Gemelo der.", "Right calf"),
    ("Antebrazo", "Forearm"),
    ("Brazo", "Arm"),
    ("Muslo", "Thigh"),
    ("Gemelo", "Calf"),
    ("Nota</th>", "Note</th>"),

    # --- resumen ---
    ("Cómo vas", "How it's going"),
    ("Lo que ha cambiado, no lo que hay", "What changed, not what is"),
    ("Racha", "Streak"),
    ("semanas</span>", "weeks</span>"),
    ("Mejor <b>", "Best <b>"),
    ("Último entreno hace", "Last workout"),
    ("Progresan", "Progressing"),
    ("Estancados", "Stalled"),
    ("Abandonados", "Dropped"),
    ("Esta semana", "This week"),
    ("Este mes", "This month"),
    (", frente a los 7 días anteriores", ", against the 7 days before"),
    ("Últimos 30 días, frente a los 30 anteriores", "Last 30 days, against the 30 before"),
    ('["Ahora", "Antes"]', '["Now", "Before"]'),
    ("<th>Cambio</th>", "<th>Change</th>"),
    ("<th>Ahora</th>", "<th>Now</th>"),
    ("<th>Fecha</th>", "<th>Date</th>"),
    ("Sesiones", "Sessions"),
    ("Volumen", "Volume"),
    ("Minutos", "Minutes"),
    ("Pasos/día", "Steps/day"),
    ("Series por músculo", "Sets per muscle"),
    ("Media semanal contra el rango que rinde, no contra tu histórico",
     "Weekly average against the range that works, not against your own history"),
    ("Semana a semana:", "Week by week:"),
    ("Media de series efectivas por semana en", "Average working sets per week over"),
    ("las últimas ${ss.n_semanas} semanas (${num(ss.total_medio, 0)} en total). Las",
     "the last ${ss.n_semanas} weeks (${num(ss.total_medio, 0)} in total). The two"),
    ("dos marcas grises son 10 y 20 series, el rango donde suele estar el trabajo",
     "grey marks are 10 and 20 sets, the range where the work that pays off usually"),
    ("que rinde. Pasa el ratón por una barra para ver semana a semana.",
     "sits. Hover a bar to see it week by week."),
    ("sem a 0", "wk at 0"),
    ("Composición corporal", "Body composition"),
    ("Cambio a 7, 30 y 90 días · una casilla vacía es que no hubo pesaje cerca",
     "Change over 7, 30 and 90 days · an empty cell means there was no weigh-in nearby"),
    ("Desde ${longd(DATA.desde)}", "Since ${longd(DATA.desde)}"),
    ("Solo cuentan los entrenos a partir de esa fecha, cuando",
     "Only workouts from that date count, when you"),
    ("cambiaste de gimnasio. Los anteriores siguen en Hevy, pero no entran en",
     "changed gyms. Earlier ones are still in Hevy, but they don't count towards"),
    ("récords, progresiones ni volumen: otras máquinas y otras poleas hacen que",
     "records, progressions or volume: other machines and other pulleys mean that"),
    ("60 kg allí no sean 60 kg aquí.", "60 kg there aren't 60 kg here."),

    # --- avisos ---
    ("Por debajo de 10 series semanales:", "Below 10 weekly sets:"),
    ("${peor.musculo} va a\n      ${num(peor.media, 1)} series de media y ha estado a cero\n"
     "      ${peor.semanas_cero} de las ${ss.n_semanas} semanas.",
     "${peor.musculo} is at ${num(peor.media, 1)} sets on average\n"
     "      and has been at zero for ${peor.semanas_cero} of the last ${ss.n_semanas} weeks."),
    ("de las", "of the"),
    ("semanas.", "weeks."),
    ("Por encima de 22 series semanales:", "Above 22 weekly sets:"),
    ("Más no siempre es mejor si otros grupos van a cero.",
     "More is not always better when other groups sit at zero."),
    ("El peso lleva ${en.dias} días plano: estás comiendo más o menos lo",
     "Weight has been flat for ${en.dias} days: you are eating about what"),
    ("que gastas.", "you burn."),
    ("El peso va a <b>", "Weight is moving at <b>"),
    ("kg por semana</b>, que es un", "kg per week</b>, which is a"),
    ("déficit", "deficit"),
    ("superávit", "surplus"),
    ("kcal al", "kcal a"),
    ("día</b>", "day</b>"),
    ("comiendo en torno a", "eating around"),
    ("Hace <b>${ci.dias} días</b> de la última tanda de cinta métrica",
     "It has been <b>${ci.dias} days</b> since the last tape-measure round"),
    ("(toca cada ${ci.cada}).", "(due every ${ci.cada})."),
    ("No has tomado ninguna medida de cinta todavía.",
     "You haven't taken any tape measurements yet."),
    ("En 90 días has", "In 90 days you have"),
    ("kg de grasa</b>", "kg of fat</b>"),
    ("kg de músculo</b>", "kg of muscle</b>"),
    ("sumado", "gained"),
    ("perdido", "lost"),
    ("% de lo", "% of what you"),
    ("ganado", "gained"),
    ("es grasa.", "is fat."),
    ("ejercicios</b> llevan más de dos meses sin tocarse.",
     "exercises</b> have gone untouched for over two months."),
    ("Los más recientes:", "The most recent:"),
    ("Llevas <b>${r.actual} semanas seguidas</b> entrenando.",
     "You have trained <b>${r.actual} weeks in a row</b>."),
    ("Tu mejor racha son ${r.mejor}.", "Your best streak is ${r.mejor}."),
    ("Músculo", "Muscle"),
    ("Grasa", "Fat"),
    ("Peso", "Weight"),
    ("Series", "Sets"),
    ("igual</span>", "same</span>"),

    # Con ${...} dentro no pasa nada: se reemplaza texto, no se evalúa. Y con
    # la interpolación dentro el trozo es único, que es lo que hace falta para
    # que " d</span>" no se lleve por delante las casillas de la ficha.
    ("ses · hace ${daysAgo(e.last)} d</span>", "sess · ${daysAgo(e.last)} d ago</span>"),
    ("<code>peso × (1 + reps/30)</code>", "<code>weight × (1 + reps/30)</code>"),
    (", del ${longd(e.prWDate)}", ", from ${longd(e.prWDate)}"),
    (", del ${longd(e.prDate)}", ", from ${longd(e.prDate)}"),

    # --- los tooltips, que solo existen al pasar el ratón ---
    ("· mejor serie\n      ${p.w}kg × ${p.r} · ${p.s} series · ${fmt(p.v)} kg de volumen",
     "· best set\n      ${p.w}kg × ${p.r} · ${p.s} sets · ${fmt(p.v)} kg of volume"),
    ("${p.s} series ·\n          ${p.n} repeticiones · mejor serie ${serie(p.w, p.r)}",
     "${p.s} sets ·\n          ${p.n} reps · best set ${serie(p.w, p.r)}"),
    ("<b>${p.n} repeticiones</b>", "<b>${p.n} reps</b>"),
    ("${p.s} series · mejor ${serie(p.w, p.r)}", "${p.s} sets · best ${serie(p.w, p.r)}"),
    ("${p.s} series</span>", "${p.s} sets</span>"),
    ("<b>${p.s} series</b>", "<b>${p.s} sets</b>"),
    ("${p.n} repeticiones${p.v", "${p.n} reps${p.v"),
    ('unit: "series"', 'unit: "sets"'),
    ('resumen(pts, "s", 0, "series")', 'resumen(pts, "s", 0, "sets")'),
    ('title="10 series"', 'title="10 sets"'),
    ('title="20 series"', 'title="20 sets"'),
    ("} de <b>${num(Math.abs(d))} kcal al", "} of <b>${num(Math.abs(d))} kcal a"),

    # --- etiquetas sueltas que solo se ven en el visor o en el lector ---
    ('label: "Calorías"', 'label: "Calories"'),
    ("Samsung Health · media móvil de 7 días", "Health Connect · 7-day moving average"),
    ("${e.dias} días", "${e.dias} days"),

    # --- los datos inventados ---
    ("Sesión de ejemplo", "Sample session"),
]

TRADUCCION += [
    # Los meses y el formato de número son del idioma, no del texto: sin esto
    # la demo inglesa fechaba en "31 ago" y contaba en 1.234,5.
    ('const MES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];',
     'const MES = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];'),
    ('toLocaleString("es-ES"', 'toLocaleString("en-GB"'),
]


def generar(proyecto: Path, destino: Path) -> str:
    """Corre el generador del propio proyecto: la demo es su dashboard, no otro."""
    guion = proyecto / "tests" / "dashboard_de_ejemplo.py"
    if not guion.exists():
        sys.exit(f"No encuentro {guion}. Pasa --proyecto con la ruta a rutina-export.")
    destino.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([sys.executable, str(guion), str(destino)], cwd=proyecto,
                   env={"PYTHONPATH": "src", "PATH": "/usr/bin:/bin"}, check=True)
    return destino.read_text(encoding="utf-8")


def con_aviso(html: str, aviso: dict) -> str:
    if "<body>" not in html:
        sys.exit("El HTML generado no tiene <body>: no se donde poner el aviso.")
    return html.replace("<body>", "<body>\n" + AVISO.format(**aviso), 1)


def traducir(html: str) -> str:
    # de la más larga a la más corta: si no, "Volumen semanal" acaba en
    # "Weekly Volumen" porque "Volumen" ya se habría reemplazado
    for es, en in sorted(TRADUCCION, key=lambda p: -len(p[0])):
        html = html.replace(es, en)
    return html.replace('<html lang="es">', '<html lang="en">', 1)


# Palabras con tilde: ningún identificador del código las lleva, así que lo que
# quede aquí es texto de pantalla sin traducir. Y las que no llevan tilde pero
# empiezan por mayúscula: los identificadores y las claves del JSON van en
# minúscula, así que un "Ahora" suelto solo puede ser una cabecera de tabla.
SIN_TILDE = ("Ahora", "Antes", "Cambio", "Fecha", "Peso", "Grasa", "Series",
             "Serie", "Sesiones", "Minutos", "Nota", "Media", "Descanso",
             "Semana", "Entreno", "Volumen", "Pasos", "Cuerpo", "Fuerza",
             "Resumen", "Actividad", "Constancia", "Nada", "Registros")
SOSPECHOSA = re.compile(r"[A-Za-zÁÉÍÓÚÑáéíóúñ]*[ÁÉÍÓÚÑáéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ]*"
                        r"|\b(?:" + "|".join(SIN_TILDE) + r")\b")


def sin_comentarios(html: str) -> str:
    """El código y sus comentarios están en castellano a propósito: aquí solo
    interesa lo que se ve en pantalla. El (?<!:) deja en paz los https://."""
    html = re.sub(r"/\*.*?\*/", " ", html, flags=re.S)
    return re.sub(r"(?<!:)//[^\n]*", " ", html)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--proyecto", default=str(RAIZ.parent / "rutina-export"),
                    help="ruta al repositorio rutina-export")
    args = ap.parse_args()

    es = generar(Path(args.proyecto).expanduser(), SALIDA / "index.html")
    (SALIDA / "index.html").write_text(con_aviso(es, AVISO_ES), encoding="utf-8")

    en = traducir(con_aviso(es, AVISO_EN))
    (SALIDA / "en").mkdir(parents=True, exist_ok=True)
    (SALIDA / "en" / "index.html").write_text(en, encoding="utf-8")

    restos = sorted(set(SOSPECHOSA.findall(sin_comentarios(en))))
    print(f"es: {SALIDA/'index.html'}")
    print(f"en: {SALIDA/'en'/'index.html'}")
    if restos:
        print("\nQueda castellano sin traducir en la copia inglesa "
              f"({len(restos)} palabras). Añádelas a TRADUCCION:")
        for r in restos:
            print("   ", r)
        return 1
    print("\nSin castellano suelto. Pasa ahora el test del DOM sobre las dos copias:")
    print("    node ../rutina-export/tests/test_dashboard.mjs "
          f"{SALIDA/'index.html'}")
    # La miniatura de la portada es una foto de este mismo HTML, así que se
    # queda vieja en cuanto el dashboard cambia. No se hace aquí para no
    # arrastrar Chrome a un guion que sólo necesitaba Python.
    print("Y rehaz la miniatura de la tarjeta, que es una foto de esto:")
    print("    python3 scripts/generar-poster-demo-rutina.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
