export interface LegalInfo {
	company:  string;
	address:  string;
	email:    string;
	web:      string;
	tax_id:   string;
	motive:   string;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// Los campos de texto libre se interpolan dentro de plantillas Markdown (ej. `[{{company}}]({{web}})`).
// Sin esto, un valor como `x](javascript:alert(1))(` rompe la sintaxis del link e inyecta uno nuevo.
// `web` queda fuera: ocupa la posición de URL, no de texto, y su defensa es el filtro de esquemas
// de `renderSafeMarkdown` aguas abajo (ver CLAUDE.md).
function escapeMarkdown(value: string): string {
	return value.replace(/[\\`*_[\]()]/g, '\\$&');
}

function fill(template: string, info: LegalInfo): string {
	const text = (value: string) => escapeHtml(escapeMarkdown(value));
	return template
		.replace(/\{\{company\}\}/g,  text(info.company))
		.replace(/\{\{address\}\}/g,  text(info.address))
		.replace(/\{\{email\}\}/g,    text(info.email))
		.replace(/\{\{web\}\}/g,      escapeHtml(info.web))
		.replace(/\{\{tax_id\}\}/g,   text(info.tax_id))
		.replace(/\{\{motive\}\}/g,   text(info.motive));
}

const AVISO_LEGAL_TEMPLATE = `## 1. Aviso Legal y Términos de Uso

Podemos garantizarte que te encuentras en un espacio 100% seguro. **{{company}}**, en aras de tener un sitio de alcance universal, cumple con el deber de información recogido en el artículo 10 de la Ley 34/2002 de la Unión Europea, de 11 de julio, referente a **Servicios de la Sociedad de la Información y del Comercio Electrónico**, a continuación se hace constar:

### 1.1. Datos identificativos del responsable

Tal y como recoge la Ley 34/2002, de 11 de julio, de servicios de la sociedad de la información y de comercio electrónico, te informamos que:

Nuestra denominación fiscal es: {{company}}
Nuestro RIF es {{tax_id}}
Nuestro domicilio fiscal se encuentra en {{address}}
Nuestro Email administrativo es {{email}}
Nuestra actividad social es: {{motive}}

### 1.2. Finalidad de la página web

Los servicios prestados por el responsable de la página web son los siguientes:

Promocionar los productos y servicios de {{company}}
Gestionar la lista de suscriptores y usuarios que se anotan en el boletín o adquieren productos o servicios de {{company}}
Suministrar de contenido a la página web.
Dirigir la red de afiliados y comerciantes, así como la gestión de pagos de los mismos.

### 1.3. Usuarios

El acceso y/o uso de este sitio web atribuye la condición de **USUARIO**, quien acepta, desde dicho acceso y/o uso, los presentes términos de uso; no obstante, por el mero uso de la página web no significa el inicio de relación laboral/comercial alguna.

### 1.4. Uso del sitio web y captura de información

#### 1.4.1 Uso del Sitio Web

La página web [{{company}}]({{web}}), en adelante **LA WEB**, proporciona el acceso a artículos, informaciones, servicios y datos, en adelante, **LOS CONTENIDOS**, que son propiedad de **{{company}}**. El USUARIO asume la responsabilidad del uso de la web.

El USUARIO se compromete a hacer un uso adecuado de los contenidos que ofrece a través de la web y, con carácter enunciativo pero no limitativo, se compromete a no emplearlos para:

(a) incurrir en actividades ilícitas, ilegales o contrarias a la buena fe y al orden público;
(b) difundir contenidos o propaganda de carácter racista, xenófobo, pornográfico-ilegal, de apología del terrorismo o atentatorio contra los derechos humanos;
(c) provocar daños en los sistemas físicos y lógicos de LA WEB, de sus proveedores o de terceras personas; introducir o difundir en la red virus informáticos o cualesquiera otros sistemas físicos o lógicos que sean susceptibles de provocar los daños anteriormente mencionados;
(d) intentar acceder y, en su caso, utilizar las cuentas de correo electrónico de otros usuarios y modificar o manipular sus mensajes.

**{{company}}** se reserva el derecho de retirar todos aquellos comentarios y aportaciones que vulneren el respeto a la dignidad de la persona, que sean discriminatorios, xenófobos, racistas, pornográficos, que atenten contra la juventud o la infancia, el orden o la seguridad pública o que, a su juicio, no resultaren adecuados para su publicación.

En cualquier caso, **{{company}}** no será responsable de las opiniones vertidas por los usuarios a través de EL SITIO u otras herramientas de participación que puedan crearse, conforme a lo previsto en la normativa de aplicación.

#### 1.4.2 Captura de información

- Formulario de contacto, donde el USUARIO deberá rellenar el campo de correo electrónico, asunto y nombre.
- Formulario de suscripción, rellenando el USUARIO los campos necesarios para la adquisición de productos con los campos de nombre, apellidos, dirección, ciudad, país, estado, código postal, email y contraseña.
- Cookies de rastreo, conforme a las siguientes reglas.
- Navegación y Dirección IP: Al navegar por esta web, el USUARIO facilita de forma automática al servidor de la web información relativa a su dirección IP, fecha y hora de acceso, el hipervínculo que le ha reenviado a éstas, tu sistema operativo y el navegador utilizado.

A pesar de lo anterior, el USUARIO podrá darse de baja en cualquier momento de los servicios prestados por **{{company}}** dando cumplimiento a la normativa vigente sobre **Protección de Datos**. Asimismo, tanto al suscribirse a esta página web como al realizar algún comentario en cualquiera de sus páginas y/o entradas, el usuario consiente:

El tratamiento de sus datos personales conforme a la [Política de Privacidad](/politica-de-privacidad) de EL SITIO.

El acceso de **{{company}}** a los datos que necesite el usuario aportar bien para la suscripción a los productos, bien para cualquier consulta mediante el formulario de contacto.

Asimismo, informamos que la información de nuestros usuarios está protegida de acuerdo a nuestra [Política de Privacidad](/politica-de-privacidad).

Desde el momento en que efectúa su suscripción o accedes a algún servicio de pago, **{{company}}** tiene acceso a: nombre, correo electrónico y demás datos necesarios para facturación, teniendo acceso a datos de nombre, apellidos, email, número de identificación y domicilio completo.

En todo caso, **{{company}}** se reserva el derecho de modificar en cualquier momento y sin necesidad de previo aviso, la presentación y configuración de LA WEB como el presente aviso legal.

## 2. Propiedad Intelectual e Industrial

**{{company}}**, por sí o como cesionario, es titular de todos los derechos de propiedad intelectual e industrial de su página web, así como de los elementos contenidos en la misma (a título enunciativo, imágenes, sonido, audio, vídeo, software o textos; marcas o logotipos, combinaciones de colores, estructura y diseño, selección de materiales usados, programas de ordenador necesarios para su funcionamiento, acceso y uso, etc.), titularidad de **{{company}}** o bien de sus licenciantes. Todos los derechos reservados.

Cualquier uso no autorizado previamente por **{{company}}**, será considerado un incumplimiento grave de los derechos de propiedad intelectual o industrial del autor.

Quedan expresamente prohibidas la reproducción, la distribución y la comunicación pública, incluida su modalidad de puesta a disposición, de la totalidad o parte de los contenidos de esta página web, con fines comerciales, en cualquier soporte y por cualquier medio técnico, sin la autorización de **{{company}}**.

El USUARIO se compromete a respetar los derechos de Propiedad Intelectual e Industrial titularidad de **{{company}}**. Podrá visualizar únicamente los elementos de la web sin posibilidad de imprimirlos, copiarlos o almacenarlos en el disco duro de su ordenador o en cualquier otro soporte físico. El USUARIO deberá abstenerse de suprimir, alterar, eludir o manipular cualquier dispositivo de protección o sistema de seguridad que estuviera instalado en las páginas de **{{company}}**.

Queda terminantemente prohibido compartir la licencia para uso con más personas, cada licencia es personal e intransferible reservándonos cuantas acciones civiles y penales nos asistan en aras de salvaguardar nuestros derechos, todo ello bajo apercibimiento de incurrir en un delito contra la propiedad intelectual e industrial y en contra del Código Penal.

## 3. Exclusión de Garantías y de Responsabilidad

**{{company}}** no se hace responsable, en ningún caso, de los daños y perjuicios de cualquier naturaleza que pudieran ocasionar, a título enunciativo: por errores u omisiones en los contenidos, por falta de disponibilidad del sitio web, el cual realizará paradas periódicas por mantenimientos técnicos, así como por la transmisión de virus o programas maliciosos o lesivos en los contenidos, a pesar de haber adoptado todas las medidas tecnológicas necesarias para evitarlo.

## 4. Modificaciones

**{{company}}** se reserva el derecho de efectuar, sin previo aviso, las modificaciones que considere oportunas en su web, pudiendo cambiar, suprimir o añadir tanto los contenidos y servicios que se presten a través de la misma como la forma en la que éstos aparezcan presentados o localizados en su web.

## 5. Política de Enlaces

Las personas o entidades que pretendan realizar o realicen un hiperenlace desde una página web de otro portal de Internet a la web de **{{company}}**, deberán someterse a las siguientes condiciones:

- No se permite la reproducción total o parcial de ninguno de los servicios ni contenidos del sitio web sin la previa autorización expresa de **{{company}}**.
- No se establecerán deep-links ni enlaces IMG o de imagen, ni frames con la web de **{{company}}**, sin su previa autorización expresa.
- No se establecerá ninguna manifestación falsa, inexacta o incorrecta sobre la web de **{{company}}**, ni sobre los servicios o contenidos de la misma.
- El establecimiento del hipervínculo no implicará la existencia de relaciones entre **{{company}}** y el titular de la página web o del portal desde el cual se realice, ni el conocimiento y aceptación de **{{company}}** de los servicios y contenidos ofrecidos en dicha página web o portal.
- **{{company}}** no será responsable de los contenidos o servicios puestos a disposición del público en la página web o portal desde el cual se realice el hipervínculo, ni de las informaciones y manifestaciones incluidas en los mismos.
- **{{company}}** no comercializa, ni dirige, ni controla previamente, ni hace propios los contenidos, servicios, informaciones y manifestaciones disponibles en dichos sitios web.
- **{{company}}** no asume ningún tipo de responsabilidad, ni siquiera de forma indirecta o subsidiaria, por los daños y perjuicios de toda clase que pudieran derivarse del acceso, mantenimiento, uso, calidad, licitud, fiabilidad y utilidad de los contenidos, informaciones, comunicaciones, opiniones, manifestaciones, productos y servicios existentes u ofrecidos en los sitios web no gestionados por **{{company}}**, y que resulten accesibles a través de sus sitios web.

## 6. Derecho de Exclusión

[**{{company}}**]({{web}}) se reserva el derecho a denegar o retirar el acceso al portal y/o los servicios ofrecidos sin necesidad de previo aviso, a instancia propia o de un tercero, a aquellos usuarios que incumplan las presentes Condiciones Generales de Uso.

## 7. Generalidades

**{{company}}** perseguirá el incumplimiento de las presentes condiciones así como cualquier utilización indebida de su web ejerciendo todas las acciones civiles y penales que le puedan corresponder en derecho.

## 8. Modificación de las presentes Condiciones y su Duración

**{{company}}** podrá modificar en cualquier momento las condiciones aquí determinadas, siendo debidamente publicadas como aquí aparecen. La vigencia de las citadas condiciones irá en función de su exposición y estarán vigentes hasta que sean modificadas por otras debidamente publicadas.

## 9. Reclamaciones y dudas

**{{company}}** informa que existen hojas de reclamación a disposición de usuarios y clientes pudiendo remitir un correo al arriba expresado indicando su nombre y apellidos, el servicio o producto adquirido y exponiendo los motivos de su reclamación.
También puede dirigir su reclamación por correo postal dirigido a: **{{company}}**, {{address}}

## 10. Legislación Aplicable y Jurisdicción

La relación entre **{{company}}** y el USUARIO se regirá sin excepción y en todos sus términos por las leyes de la Republica Bolivariana de Venezuela y será interpretada de acuerdo a ellas. Cualquier controversia derivada de la presente política, su existencia, validez, interpretación, alcance o cumplimiento será sometida a los tribunales ordinarios o al centro de arbitraje con jurisdicción en Venezuela. Los usuarios con la aceptación de esta política renuncian al fuero territorial o a cualquier otra jurisdicción.`;

const POLITICA_PRIVACIDAD_TEMPLATE = `**{{company}}**, en aras de tener un sitio de alcance universal, cumple con el deber de información, de conformidad con lo dispuesto en el Reglamento General (UE) Sobre Protección de Datos; mediante la aceptación de la presente Política de Privacidad, prestas tu consentimiento informado, expreso, libre e inequívoco para que los datos personales que proporciones a través de la página web [{{web}}]({{web}}), en adelante SITIO WEB, sean incluidos en un fichero de "USUARIOS WEB Y SUSCRIPTORES" así como "CLIENTES Y/O PROVEEDORES".

Asimismo, nuestra denominación fiscal es: **{{company}}**
Nuestro RIF es **{{tax_id}}**
Nuestro domicilio fiscal se encuentra en **{{address}}**
Nuestro Email es: **{{email}}**
Nuestra actividad social es: {{motive}}

La presente Política de Privacidad será válida únicamente para los datos de carácter personal obtenidos en el SITIO WEB, no siendo aplicable para aquella información recabada por terceros en otras páginas web, incluso si estas se encuentran enlazadas por el SITIO WEB.

Con ello manifiesto, nuestro compromiso es mantener y garantizar las relaciones comerciales de forma segura mediante la protección de los datos personales y garantizando el derecho a la privacidad de cada uno de los usuarios de nuestro SITIO WEB.

## 1. ¿Qué son los Datos Personales?

Datos Personales se refiere a cualquier información relativa a una persona que esta nos facilita cuando visita nuestro SITIO WEB. En nuestro caso, nombre e email; si compra algún producto necesitando factura, solicitaremos domicilio completo, nombre, apellidos y DNI, CIF, CI, RIF o cualquier documento que identifique al cliente.

Adicionalmente, cuando visitas nuestro SITIO WEB, determinada información se almacena automáticamente por motivos técnicos como la [dirección IP](https://es.wikipedia.org/wiki/Direcci%C3%B3n_IP) asignada por su proveedor de acceso a Internet.

## 2. Finalidad, Legitimación, Categoría de los Datos, Consentimiento al Tratamiento, Menores de Edad.

### 2.1 Finalidad

Tal y como se recoge en la normativa, se informa al USUARIO que, a través de los formularios de contacto o suscripciones, se recaban datos que se almacenan en un fichero con la exclusiva finalidad de envío de comunicaciones electrónicas, tales como:

- Boletines (newsletters)
- Nuevas entradas (posts)
- Ofertas comerciales
- Webinars gratuitos
- Cualquier otra comunicación que **{{company}}** entienda interesante para sus USUARIOS. Los campos marcados como de cumplimentación obligatoria son imprescindibles para realizar la finalidad expresada.

Asimismo, podrá dar cumplimiento mediante los datos, a los requerimientos solicitados por los USUARIOS.

#### En definitiva, la FINALIDAD es la siguiente:

Dar a conocer la marca, sus productos y servicios.
Gestionar la lista de suscriptores y usuarios adscritos a los productos y servicios suministrados por **{{company}}**.
Suministro de contenidos en el blog.
Dirigir su red de afiliados y comerciantes así como la gestión de pagos de los mismos.

Únicamente el titular tendrá acceso a sus datos y, bajo ningún concepto, estos datos serán cedidos, compartidos, transferidos ni vendidos a ningún tercero.

La aceptación de la Política de Privacidad, mediante el procedimiento establecido de [doble opt-in](https://en.wikipedia.org/wiki/Opt-in_email), se entenderá a todos los efectos como la prestación de CONSENTIMIENTO EXPRESO E INEQUÍVOCO del USUARIO al tratamiento de los datos de carácter personal en los términos que se exponen en el presente documento, así como a la transferencia internacional de datos que se produce, exclusivamente debido a la ubicación física de las instalaciones de los proveedores de servicios y encargados del tratamiento de datos.

En ningún caso se realizará un uso diferente que la finalidad para los que han sido recabados los datos ni muchos menos cederé a un tercero estos datos.

### 2.2 Menores de Edad

En el supuesto de ser mayor de catorce (14) años, podrás registrarte en el **SITIO WEB** sin necesidad del consentimiento previo de tus padres o tutores.

#### ¿Qué ocurre en el caso de que seas menor de catorce (14) años?

En este supuesto, será condición obligatoria el consentimiento de tus padres o tutores para que podamos tratar sus datos personales.

**Advertencia:** Si tienes menos de catorce (14) años y no has obtenido el consentimiento de tus padres, no puedes registrarte en el SITIO WEB, por lo que procederemos a denegar tu solicitud en caso de tener constancia de ello.

### 2.3 Legitimación

Gracias al consentimiento, podemos tratar tus datos siendo requisito obligatorio para poder suscribirte al SITIO WEB. Como bien sabes, puedes retirar tu consentimiento en el momento que lo desees.

### 2.4 Categoría de Datos

Los datos recabados en ningún momento son especialmente protegidos, sino que se encuentran categorizados como datos identificativos.

### 2.5 Tiempo de Conservación de los Datos

Conservaremos tus datos durante el tiempo legalmente establecido o hasta que solicites eliminarlos.

### 2.6 Exactitud y Veracidad de los Datos

Obviamente, eres la única persona responsable de la veracidad y exactitud de los datos que remitas, por lo que nos eximes de cualquier tipo de responsabilidad al respecto.

Como usuario, debes garantizar la exactitud y autenticidad de los datos personales facilitados debiendo aportar la información completa y correcta en los distintos formularios de captación de datos.

## 3. Cumplimiento de la Normativa de Aplicación

**{{company}}**, con el objetivo de mantener operaciones en España y la Unión Europea, cumple con las directrices de la Ley Orgánica 15/1999 de 13 de diciembre de Protección de Datos de Carácter Personal, el Real Decreto 1720/2007 de 21 de diciembre por el que se aprueba el Reglamento de desarrollo de dicha Ley Orgánica y demás normativa vigente y de aplicación en cada momento, velando por garantizar un correcto uso y tratamiento de los datos personales del usuario.

De igual manera, a partir de mayo de 2018, nos regimos por la normativa que entró en aplicación, siendo el Reglamento General sobre Protección de Datos (RGPD) de la Unión Europea.

Asimismo, **{{company}}** informa que da cumplimiento a la Ley 34/2002 de 11 de julio, de Servicios de la Sociedad de la Información y el Comercio Electrónico y le solicitará su consentimiento al USUARIO para el tratamiento de su correo electrónico con fines comerciales en cada momento.

En cumplimiento de lo establecido en la normativa, le informamos que los datos suministrados, así como aquellos datos derivados de su navegación, podrán ser almacenados en los ficheros de **{{company}}** y tratados para la finalidad de atender su solicitud y el mantenimiento de la relación que se establezca en los formularios que suscriba.

Adicionalmente, el USUARIO consiente el tratamiento de sus datos con la finalidad de informarles, por cualquier medio, incluido el correo electrónico, de productos y servicios de **{{company}}**.

En caso de no autorizar el tratamiento de sus datos con la finalidad señalada anteriormente, el USUARIO podrá ejercer su derecho de oposición al tratamiento de sus datos en los términos y condiciones previstos más adelante en el apartado "Ejercicio de Derechos".

## 4. Medidas de Seguridad

**{{company}}** le informa que tiene implantadas las medidas de seguridad de índole técnica y organizativas necesarias para garantizar la seguridad de sus datos de carácter personal y evitar su alteración, pérdida y tratamiento y/o acceso no autorizado, habida cuenta del estado de la tecnología, la naturaleza de los datos almacenados y los riesgos a que están expuestos, ya provengan de la acción humana o del medio físico o natural. Todo ello de conformidad con lo previsto en el [RGPD](https://es.wikipedia.org/wiki/Reglamento_General_de_Protecci%C3%B3n_de_Datos).

Asimismo, **{{company}}** ha establecido medidas adicionales en orden de reforzar la confidencialidad e integridad de la información en su organización. Manteniendo continuamente la supervisión, control y evaluación de los procesos para asegurar el respeto de la privacidad de los datos.

## 5. Ejercicio de Derechos

Aquellas personas físicas que hayan facilitado sus datos a través del SITIO WEB, podrán dirigirse al titular de la misma con el fin de poder ejercitar gratuitamente sus derechos de acceso a sus datos, rectificación o supresión, limitación y oposición respecto de los datos incorporados en sus ficheros.

El método más rápido y sencillo sería accediendo en tu cuenta de usuario directamente y modificar tus datos o borrar tu cuenta de usuario. Cualquier información que necesitemos almacenar, en virtud de una obligación legal o contractual, será bloqueada y sólo utilizada para dichos fines en lugar de ser borrada.

El interesado podrá ejercitar sus derechos mediante comunicación por escrito dirigida a **{{company}}** con la referencia "Protección de datos", especificando sus datos, acreditando su identidad y los motivos de su solicitud en la siguiente dirección:

**{{company}}**
{{address}}

También podrá ejercitar los derechos, a través del correo electrónico arriba definido.

## 6. Links o Enlaces Externos

Como un servicio a nuestros visitantes, nuestro SITIO WEB puede incluir hipervínculos a otros sitios que no son operados o controlados por **{{company}}**. Por ello, el SITIO WEB no garantiza, ni se hace responsable de la licitud, fiabilidad, utilidad, veracidad y actualidad de los contenidos de tales sitios web o de sus prácticas de privacidad. Por favor, antes de proporcionar su información personal a estos sitios web ajenos a [{{web}}]({{web}}), tenga en cuenta que sus prácticas de privacidad pueden diferir de las nuestras.

El único objeto de los enlaces es proporcionar al USUARIO la posibilidad de acceder a dichos enlaces y conocer nuestro trabajo, aunque no ofrece ni comercializa por sí ni por medio de terceros la información, contenidos y servicios disponibles en los sitios enlazados, ni aprueba, supervisa o controla en modo alguno los contenidos y servicios y cualquier material de cualquier naturaleza existente en los mismos. **{{company}}** no se responsabiliza en ningún caso de los resultados que puedan derivarse al USUARIO por acceso a dichos enlaces.

## 7. Modificación de la Política de Privacidad

**{{company}}** se reserva el derecho a modificar su Política de Privacidad, de acuerdo a su propio criterio, motivado por un cambio legislativo, jurisprudencial o doctrinal de la entidad venezolana encargada de la Protección de Datos, o de las entidades europeas pertinentes en pro de continuar prestando servicio de manera universal.

Cualquier modificación de la Política de Privacidad será publicada al menos diez días antes de su efectiva aplicación. El uso de [{{web}}]({{web}}) después de dichos cambios, implicará la aceptación de dichos cambios.

## 8. Responsable del Fichero y Encargados del Tratamiento

El responsable del fichero de datos es **{{company}}**

## 9. Servicios Ofrecidos por Terceros en esta Web

Para prestar servicios estrictamente necesarios para el desarrollo de nuestra actividad, el SITIO WEB utiliza los siguientes prestadores bajo sus correspondientes condiciones de privacidad:

Medios de pago: Paypal
Privacidad de fuentes de rastreo utilizadas en este sitio: Google Analytics, Meta

En el SITIO WEB también se estudian las preferencias de sus usuarios, sus características demográficas, sus patrones de tráfico, y otra información en conjunto para comprender mejor quiénes constituyen nuestra audiencia y qué es lo que necesita. El rastreo de las preferencias de nuestros usuarios también nos ayuda a mostrarle los avisos publicitarios más relevantes.

El USUARIO y, en general, cualquier persona física o jurídica, podrá establecer un hiperenlace o dispositivo técnico de enlace (por ejemplo, links o botones) desde su sitio web a [{{web}}]({{web}}) (el "Hiperenlace"). El establecimiento del Hiperenlace no implica en ningún caso la existencia de relaciones entre el SITIO WEB y el propietario del sitio o de la página web en la que se establezca el Hiperenlace, ni la aceptación o aprobación por parte de el SITIO WEB de sus contenidos o servicios. En todo caso, el SITIO WEB se reserva el derecho de prohibir o inutilizar en cualquier momento cualquier Hiperenlace al SITIO WEB.

## 10. ¿No deseas recibir información de nosotros o deseas revocar tu consentimiento?

De conformidad con lo dispuesto en la Ley 34/20023, de 11 de junio de Servicios de la Sociedad de la Información y del Comercio Electrónico puedes oponerte al uso de su información para fines publicitarios, investigaciones de mercado o desarrollo de encuestas de satisfacción en cualquier momento, así como revocar tu consentimiento en cualquier momento (sin efecto retroactivo).

Para ello, deberás enviar un correo electrónico a la dirección arriba definida. Si has recibido publicidad por correo electrónico, también podrás oponerte desde dicho correo electrónico, pinchando en el enlace incluido en el mismo siguiendo las instrucciones que te sean facilitadas. Otra forma más sencilla sería acceder a tu cuenta de usuario y seleccionar las opciones correspondientes.

Por favor, ten en cuenta que nuestros sistemas pueden requerir un lapso de tiempo que en ningún caso superará 48 horas para que tu oposición o revocación se hagan efectivas, entendiéndose que durante dicho periodo de tiempo puedes seguir recibiendo mensajes.

En relación con la gestión de tus datos asociados a los perfiles sociales de **{{company}}**, el ejercicio del derecho de acceso, dependerá de la funcionalidad de la red social y las posibilidades de acceso a la información de los perfiles de los usuarios. Con relación a los derechos de acceso y rectificación, le recomendamos que solo podrá satisfacerse en relación a aquella información que se encuentre bajo el control de **{{company}}**

Además podrá dejar de interactuar, seguir o recibir información de los perfiles sociales de **{{company}}**, eliminar los contenidos que dejen de interesarte o restringir con quién comparte sus conexiones mediante los mecanismos estipulados en las diferentes redes sociales.

El USUARIO podrá acceder a la Política de Privacidad de cada red social, así como configurar su perfil para garantizar su privacidad. **{{company}}** anima a los usuarios a familiarizarse con las condiciones de uso de las distintas redes sociales antes de comenzar a usarlas.

Facebook: [https://www.facebook.com/help/323540651073243/](https://www.facebook.com/help/323540651073243/)
Youtube: [http://www.google.es/intl/es/policies/privacy/](http://www.google.es/intl/es/policies/privacy/)
Twitter: [https://twitter.com/privacy](https://twitter.com/privacy)

## 11. Sistemas de Captura de Datos Personales y su Finalidad

**Formularios de suscripción a contenidos:** dentro de la web existen varios formularios para activar la suscripción gestionada por **{{company}}** con la finalidad de enviar campañas de marketing por correo electrónico, gestión de suscripciones y envío de boletines o noticias.

**Formulario de comentarios:** el SITIO WEB incluye un formulario cuya finalidad es comentar los artículos y dar su opinión respetando la libertad de expresión. El usuario podrá publicar comentarios en los post que se publiquen. Los datos personales introducidos en el formulario para insertar estos comentarios serán utilizados exclusivamente para moderarlos y publicarlos, recabando igualmente estos datos.

**Formulario de contacto:** existe un formulario de contacto cuya finalidad es la respuesta de consultas, sugerencias o contacto profesional. En este caso se utilizará la dirección de correo electrónico para responder a las mismas y enviar la información que el usuario requiera a través de la web.

**Cookies:** cuando el usuario se registra o navega en esta web, se almacenan "cookies". El usuario puede consultar en cualquier momento la [Política de Cookies](/politica-de-cookies) para ampliar información sobre el uso de cookies y como desactivarlas.

**Venta de infoproductos:** a través del SITIO WEB, se pueden adquirir infoproductos; en este caso, se requieren datos del comprador, tal como el nombre, apellido, dirección, e-mail y número de identificación fiscal.

Los usuarios podrán darse de baja en cualquier momento de los servicios prestados por el SITIO WEB a través de un formulario de cancelación.

**Sistemas de rastreo utilizados en este sitio:** Google Analytics y Google Tag Manager en el SITIO WEB también estudian las preferencias de sus usuarios, sus características demográficas, sus patrones de tráfico, y otra información en conjunto para comprender mejor quiénes constituyen su audiencia y qué es lo que esta necesita. Puedes conocer la Política de Privacidad General de los servicios de Google [aquí.](https://policies.google.com/privacy?hl=es) Adicionalmente, puedes conocer cómo utiliza Google la información de sitios web o aplicaciones que utilizan sus servicios [aquí](https://policies.google.com/technologies/partner-sites?hl=es).

El rastreo de las preferencias de nuestros usuarios también nos ayuda a mostrarte los avisos publicitarios más relevantes, por medio del uso del producto de Google, Google Adwords. De acuerdo a la Política de Privacidad de Google, no recolectan datos personales. Sin embargo, si no quieres que utilicemos la herramienta de "remarketing" de Google, puedes desactivar esta opción modificando las configuraciones adecuadas [aquí](https://adssettings.google.com/).

Más información de cómo utiliza Google las cookies en publicidad [aquí](https://policies.google.com/technologies/ads?hl=es).

Asimismo, me gustaría informarte que, para la captación de suscriptores y clientes, utilizamos Facebook Ads, por lo que al generar un anuncio, se puede segmentar el público por el lugar, datos demográficos, intereses, entre otras variables; los datos obtenidos por el SITIO WEB estarían sujetos a esta Política de Privacidad desde el momento en que el USUARIO acepta la Política de Cookies y la Política de Privacidad.

No vamos a compartir, vender, alquilar tu información personal con otras partes. Podemos compartir cierta información con los proveedores de servicios de terceros autorizados necesarios para prestar algunos servicios, tal como se ha venido explicando en párrafos anteriores.

## 12. Plugins Sociales

En nuestra página web te ofrecemos enlaces y servicios relacionados con las diferentes redes sociales. Si eres miembro de una red social y haces clic sobre el correspondiente enlace, el proveedor de la red social podrá enlazar tus datos de perfil con la información en tu visita a dicha página web.

Por tanto, es conveniente informarte sobre las funciones y políticas sobre el tratamiento de datos personales de la respectiva red social si accedes a una de nuestras páginas web con alguno de tus perfiles en redes sociales o compartes información a través de ellos.

Puedes acceder en todo momento a la política de privacidad de las diferentes redes sociales, así como configurar tu perfil para garantizar su privacidad. Te animamos a familiarizarte con las condiciones de uso de dichas redes sociales antes de comenzar a usarlas:

Facebook: [https://www.facebook.com/help/323540651073243/](https://www.facebook.com/help/323540651073243/)
Youtube: [http://www.google.es/intl/es/policies/privacy/](http://www.google.es/intl/es/policies/privacy/)
Twitter: [https://twitter.com/privacy](https://twitter.com/privacy)

## 13. Aceptación, Consentimiento y Revocabilidad

El Usuario declara haber sido informado de las condiciones sobre protección de datos de carácter personal, aceptando y consintiendo el tratamiento de los mismos por parte de **{{company}}** en la forma y para las finalidades indicadas en el [Aviso Legal](/aviso-legal).

Como bien sabes y le hemos comunicado a lo largo de la presente Política de privacidad, en cualquier momento podrá revocar sus datos, pero siempre sin carácter retroactivo.

## 14. Cambios en la Presente Política de Privacidad

**{{company}}** se reserva el derecho a modificar la presente política para adaptarla a novedades legislativas o jurisprudenciales así como a prácticas de la industria. En dichos supuestos, el Prestador anunciará en esta página los cambios introducidos con razonable antelación a su puesta en práctica.`;

const POLITICA_COOKIES_TEMPLATE = `**{{company}}**, en aras de tener un sitio de alcance universal, cumple con el deber de informar lo siguiente:

La LSSI-CE obliga a todos los que tenemos una web a **advertir al usuario de la existencia de cookies, informar sobre ellas y requerirle permiso para descargarlas**.

Siguiendo lo establecido en el art. 22.2 de la Ley 34/2002: *"Los prestadores de servicios podrán utilizar dispositivos de almacenamiento y recuperación de datos en equipos terminales de los destinatarios, a condición de que los mismos **hayan dado su consentimiento después de que se les haya facilitado información clara y completa sobre su utilización**, en particular, sobre los fines del tratamiento de los datos, con arreglo a lo dispuesto en la Ley Orgánica 15/1999, de 13 de diciembre, de Protección de Datos de Carácter Personal".*

Debes conocer que, teniendo en cuenta la forma en la que funciona Internet y los sitios web, no siempre es posible contar con información actualizada de las cookies que terceras partes puedan utilizar a través de este sitio web. Esto se aplica especialmente a casos en los que esta página web contiene elementos integrados: textos, documentos, imágenes o breves películas que se almacenan en otra parte, pero se muestran en nuestro sitio web.

Por consiguiente, en caso de que te encuentres con este tipo de cookies en este sitio web y no estén enumeradas en la lista siguiente, te rogamos que nos lo comuniques. También puedes ponerte en contacto directamente con el tercero para pedirle información sobre las cookies que coloca, la finalidad y la duración de la cookie, y cómo ha garantizado su privacidad.

## ¿Qué son las Cookies?

Las cookies constituyen una herramienta empleada por los servidores Web para almacenar y recuperar información acerca de sus visitantes. No es más que un fichero de texto que algunos servidores piden a nuestro navegador que escriba en nuestro disco duro, con información acerca de lo que hemos estado haciendo por sus páginas. Poseen una fecha de caducidad, que puede oscilar desde el tiempo que dure la sesión hasta una fecha futura especificada, a partir de la cual dejan de ser operativas.

## Las cookies que utiliza esta web

En esta web se utilizan cookies **propias y de terceros** para conseguir que tengas una mejor experiencia de navegación, puedas compartir contenido en redes sociales, para mostrarte anuncios en función a tus intereses y para obtener estadísticas de usuarios.

Por ello, las cookies empleadas en [{{web}}]({{web}}), a partir de ahora denominado el SITIO WEB, se asocian únicamente con un Usuario anónimo y su ordenador, no proporcionan referencias que permitan deducir el nombre y apellidos del Usuario y no pueden leer datos de su disco duro ni incluir virus en sus textos. Asimismo, el SITIO WEB no puede leer las cookies implantadas en el disco duro del Usuario desde otros servidores.

El usuario puede libremente decidir acerca de la implantación o no en su disco duro de las cookies empleadas en el SITIO WEB. En este sentido, el usuario puede configurar su navegador para aceptar o rechazar por defecto todas las cookies o para recibir un aviso en pantalla de la recepción de cada cookie y decidir en ese momento su implantación o no en su disco duro. Para ello le sugerimos consultar la sección de ayuda de su navegador para saber cómo cambiar la configuración que actualmente emplea.

Como usuario que eres, puedes rechazar el tratamiento de los datos o la información bloqueando estas cookies mediante la configuración apropiada de tu navegador. Sin embargo, debes saber que, si lo haces, este sitio podría dejar de funcionar adecuadamente.

Según los términos incluidos en el artículo 22.2 de la Ley 34/2002 de Servicios de la Sociedad de la Información y Comercio Electrónico, si continúas navegando, **estarás prestando tu consentimiento** para el empleo de las cookies que detallamos a continuación. Las cookies de esta web ayudan a:

- Hacer que esta web funcione correctamente
- Ahorrarte el tener que iniciar sesión cada vez que visitas este sitio
- Recordarte tus ajustes durante y entre las visitas
- Permitirte visualizar videos
- Mejorar la velocidad / seguridad del sitio
- Que puedas compartir páginas con redes sociales
- Mejorar continuamente este sitio web
- Mostrarte anuncios en función de tus hábitos de navegación

### No utilizaré jamás cookies para:

- Recoger información de identificación personal (sin tu permiso expreso)
- Recoger información sensible (sin tu permiso expreso)
- Compartir datos de identificación personal a terceros

## Cookies de terceros que utilizamos en esta web

Esta web, como la mayoría de sitios web, incluye funcionalidades proporcionadas por terceros. También se ponen a prueba regularmente nuevos diseños o servicios de terceros para recomendaciones e informes. Esto puede modificar ocasionalmente la configuración de cookies y, por ende, que aparezcan cookies no detalladas en la presente política. **En ningún caso se van a utilizar cookies que comprometan tu privacidad.**

Entre las cookies de terceros más estables están **las generadas por servicios de análisis**, concretamente, Google Analytics para ayudar al SITIO WEB a analizar el uso que hacen los Usuarios del sitio web y mejorar la usabilidad del mismo, pero en ningún caso se asocian a datos que pudieran llegar a identificar al usuario.

Google Analytics, es un servicio analítico de web prestado por Google, Inc., una compañía de Delaware cuya oficina principal está en 1600 Amphitheatre Parkway, Mountain View (California), CA 94043, Estados Unidos ("Google").

Las **Cookies de redes sociales** pueden almacenarse en su navegador mientras navega por la web o cuando utiliza el botón de compartir contenidos en alguna red social. Las empresas que generan estas cookies tienen sus propias políticas de cookies:

- Cookie de Twitter, según lo dispuesto en su [Política de Privacidad y uso de cookies](https://twitter.com/privacy).
- Cookie de LinkedIn, según lo dispuesto en su [Política de cookies](https://www.linkedin.com/legal/cookie-policy?trk=hp-cookies).
- Cookie de Facebook, según lo dispuesto en su [Política de Cookies](https://www.facebook.com/help/cookies?ref_type=sitefooter).
- Cookie de YouTube, según lo dispuesto en su [Política de Cookies](https://www.google.es/intl/es/policies/technologies/cookies/).

Las implicaciones de privacidad estarán en función de cada red social y dependerán de la configuración de privacidad que ha elegido en estas redes. En ningún caso, ni el responsable de esta web ni los anunciantes pueden obtener información personal identificable de estas cookies.

A continuación, y según exige el artículo 22.2 de la LSSI se detallan las cookies que pueden instalarse habitualmente durante la navegación por este sitio web:

| NOMBRE | DURACIÓN | FINALIDAD |
|--------|----------|-----------|
| Propia: tve_leads_unique | Caduca al finalizar sesión | Almacenan información del usuario y sus sesiones para mejorar la experiencia de usuario |
| Terceros: _ga | 2 años a partir de la configuración | Se usa para distinguir a los usuarios. Cookie de Google Analytics. [Más información](https://www.google.com/intl/es/policies/) |
| Terceros: _gat | 10 minutos | Se usa para saber el ratio de recarga. Cookie de Google Analytics. [Más información](https://www.google.com/intl/es/policies/) |
| Terceros: __utma | 2 años desde cada actualización | Se suele establecer durante la primera visita. Se utiliza para determinar visitantes únicos y es actualizada con cada página vista. [Más información](https://www.google.com/intl/es/policies/) |
| Terceros: __utmb | 2 años desde cada actualización | Se utiliza para establecer y continuar una sesión de usuario en nuestro sitio. Caduca cuando un usuario deja de visitar nuestro sitio por un período de 30 minutos. [Más información](https://www.google.com/intl/es/policies/) |
| Terceros: APISID, HSID, NID, SAPISID, SID, SSID | 2 años desde su instalación | Guarda preferencias de usuario y otra información de los servicios de Google. [Más información](https://www.google.com/policies/privacy/) |
| Terceros: __utmt | De sesión | Operaba junto con __utmb para determinar si se debía establecer una nueva sesión. Hoy en día mantiene compatibilidad hacia atrás con ga.js. [Más información](https://www.google.com/intl/es/policies/) |
| Terceros: __utmz | 6 meses desde cada actualización | Guarda información de referencias utilizadas por el visitante para llegar a nuestro sitio. Se actualiza en cada vista de página. [Más información](https://www.google.com/intl/es/policies/) |
| Propia: __cfduid | 5 años | Se utiliza para anular las restricciones de seguridad basadas en la dirección IP del visitante. [Más información](https://support.cloudflare.com/hc/en-us/articles/200170156-What-does-the-CloudFlare-cfduid-cookie-do) |
| Terceros: __smToken | Caduca al finalizar la sesión | Se usa para diferenciar los usuarios a los que se les ha mostrado alguna funcionalidad de Sumome. [Más información](https://sumo.com/tos) |
| Propia: __smVID | Caduca al finalizar la sesión | Almacena información del usuario y sus sesiones para mejorar la experiencia de usuario. |
| _remember_checked_on | Caduca al finalizar la sesión | Cookies con funcionalidades de Twitter. |
| Terceros: __stripe_mid | Caduca al finalizar la sesión | Cookie de Stripe. [Más información](https://stripe.com/cookies-policy/legal) |
| Terceros: pl | 90 días | Se utiliza para registrar que un dispositivo o un navegador iniciaron sesión a través de la plataforma de Facebook. [Más información](https://www.facebook.com/policy/cookies/printable) |
| Terceros: fr | 90 días | Cookie de publicidad principal de Facebook. Se utiliza para ofrecer, analizar y mejorar la relevancia de los anuncios. [Más información](https://www.facebook.com/policy/cookies/printable) |
| Terceros: sb | 2 años desde su instalación | Cookie de Facebook que identifica al navegador con fines de autenticación del inicio de sesión. [Más información](https://www.facebook.com/policy/cookies/printable) |
| Terceros: c_user | 20 días desde su instalación | Se utiliza junto con la cookie xs para autenticar tu identidad en Facebook. [Más información](https://www.facebook.com/policy/cookies/printable) |
| Terceros: xs | 90 días desde su instalación | Se utiliza junto con la cookie c_user para autenticar tu identidad en Facebook. [Más información](https://www.facebook.com/policy/cookies/printable) |
| Terceros: datr | 2 años desde su instalación | De Facebook que identifica a los navegadores con fines de seguridad e integridad del sitio. [Más información](https://www.facebook.com/policy/cookies/printable) |
| Terceros: driftt_aid | Caduca al finalizar la sesión | Cookie de chat. |
| Terceros: __zlcmid | Caduca al finalizar la sesión | Cookie de la herramienta Zopin utilizada para chat. |
| Terceros: ac_enable_tracking | Caduca al finalizar la sesión | Cookie utilizada por Active Campaign para trackear las visitas de la web. |
| CONSENT | — | Cookie de reproducción de contenido en YouTube. |

## ¿Cómo puedo gestionar y desactivar estas cookies?

En el caso de desear que el SITIO WEB no instale ninguna cookie en tu equipo, cabe la posibilidad de adaptar tu navegador de modo que se te notifique antes de que se descargue alguna cookie.

De igual manera, se puede modificar la configuración del navegador de forma que rechace todas las cookies o únicamente las cookies de terceros. También puedes eliminar cualquiera de las cookies que ya se encuentren en tu equipo. Ten en cuenta que tendrás que adaptar por separado la configuración de cada navegador y equipo que utilices.

El SITIO WEB pone a disposición de los usuarios que quieran impedir la instalación de las mencionadas cookies, enlaces a los navegadores cuyo uso se considera más extendido:

[Google Chrome](http://support.google.com/chrome/bin/answer.py?hl=es-419&answer=95647) - [Mozilla Firefox](http://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-que-los-sitios-we) - [Apple Safari](http://support.apple.com/kb/HT1677?viewlocale=es_ES)

**Política de Cookies a 01 de enero de 2024.**`;

export const LEGAL_PAGES = [
	{
		slug:      'aviso-legal',
		full_path: '/aviso-legal',
		title:     'Aviso Legal',
		content:   (info: LegalInfo) => fill(AVISO_LEGAL_TEMPLATE, info),
	},
	{
		slug:      'politica-de-privacidad',
		full_path: '/politica-de-privacidad',
		title:     'Política de Privacidad',
		content:   (info: LegalInfo) => fill(POLITICA_PRIVACIDAD_TEMPLATE, info),
	},
	{
		slug:      'politica-de-cookies',
		full_path: '/politica-de-cookies',
		title:     'Política de Cookies',
		content:   (info: LegalInfo) => fill(POLITICA_COOKIES_TEMPLATE, info),
	},
] as const;
