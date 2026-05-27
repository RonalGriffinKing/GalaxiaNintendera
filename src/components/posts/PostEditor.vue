<template>
  <Teleport to="body">
    <div class="post-editor-modal">
    <div class="post-editor-panel" :class="{ 'hero-editor-panel': isHeroMode, 'preview-collapsed': previewCollapsed, 'onboarding-locked': !isInitialFlowComplete }">
      <header class="editor-topbar">
        <button type="button" class="back-btn" @click="emit('close')">
          <i class="fas fa-arrow-left"></i>
          Volver a gestion
        </button>

        <div class="editor-title-block">
          <h2>{{ editorTitle }} <i class="fas fa-wand-magic-sparkles"></i></h2>
          <p>{{ editorSubtitle }}</p>
        </div>

        <div class="editor-actions-top">
          <button v-if="!isHeroMode" type="button" class="utility-btn" @click="pasteJsonIntoPost">
            <i class="fas fa-code"></i>
            Pegar JSON
          </button>
          <button v-if="!isHeroMode" type="button" class="utility-btn" @click="openImagePicker('cover')">
            <i class="far fa-images"></i>
            Imagenes IGDB
          </button>
          <button v-if="!isHeroMode" type="button" class="utility-btn" @click="previewCollapsed = !previewCollapsed">
            <i :class="previewCollapsed ? 'far fa-eye' : 'far fa-eye-slash'"></i>
            {{ previewCollapsed ? 'Visualizar' : 'Esconder preview' }}
          </button>
          <button v-if="!isHeroMode" type="button" class="draft-btn" @click="savePost('draft')" :disabled="loading">
            <i class="far fa-clipboard"></i>
            Guardar borrador
          </button>
          <button type="button" class="publish-top-btn" @click="savePost('pending')" :disabled="loading || !isInitialFlowComplete">
            <i class="far fa-paper-plane"></i>
            {{ loading ? 'Guardando...' : 'Publicar' }}
          </button>
          <button class="panel-close-btn" type="button" @click="emit('close')">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
      </header>

      <div v-if="!isHeroMode" class="mobile-stepper">
        <button type="button" :class="{ active: mobileStep === 'info' }" @click="mobileStep = 'info'">
          <span>1</span>
          Informacion
        </button>
        <button type="button" :class="{ active: mobileStep === 'sections' }" :disabled="!isInitialFlowComplete" @click="mobileStep = 'sections'">
          <span>2</span>
          Secciones
        </button>
        <button type="button" :class="{ active: mobileStep === 'preview' }" :disabled="!isInitialFlowComplete" @click="mobileStep = 'preview'">
          <span>3</span>
          Vista previa
        </button>
      </div>

      <main class="editor-layout" :class="{ 'hero-editor-layout': isHeroMode }">
        <section class="editor-column info-column" :class="{ 'mobile-hidden': !isHeroMode && mobileStep !== 'info' }">
          <article class="editor-accordion main-accordion open" :class="{ incomplete: !isInitialFlowComplete }">
            <button type="button" class="accordion-trigger" @click="toggleAccordion('main')">
              <span class="accordion-icon"><i class="fas fa-shield-halved"></i></span>
              <span>
                <strong>1. Informacion principal</strong>
                <small>Lo esencial de tu noticia.</small>
              </span>
              <em v-if="!isInitialFlowComplete && !isHeroMode" class="start-badge">Inicia por aqui</em>
              <i :class="isAccordionOpen('main') ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
            </button>

            <div v-show="isAccordionOpen('main')" class="accordion-body">
              <label class="field-group featured-field">
                <span>Titulo del post</span>
                <div class="input-shell">
                  <input v-model="post.title" :maxlength="100" :placeholder="isHeroMode ? 'Ej: Oferta especial de hoy' : 'Ej: Analisis de Dream Kart World'" />
                  <small>{{ post.title.length }}/100</small>
                </div>
              </label>

              <label class="field-group summary-field">
                <span>{{ isHeroMode ? 'Mensaje principal' : 'Resumen / Intro' }}</span>
                <div class="input-shell textarea-shell">
                  <textarea v-model="post.content" :maxlength="220" :placeholder="isHeroMode ? 'Escribe el saludo, oferta o aviso que se vera al entrar a la web...' : 'Escribe la promesa rapida del articulo en dos o tres lineas...'" />
                  <small>{{ post.content.length }}/220</small>
                </div>
              </label>

              <div class="field-group">
                <div class="field-row">
                  <span>{{ isHeroMode ? 'Categoria principal' : 'Categorias (max. 3)' }}</span>
                  <small>{{ selectedCategories.length }}/{{ isHeroMode ? 1 : 3 }}</small>
                </div>
                <div class="category-combobox">
                  <select v-model="categorySelectValue" :disabled="!canAddCategory" @change="addSelectedCategory">
                    <option value="">{{ selectedCategories.length ? 'Agregar categoria' : 'Elegir categoria' }}</option>
                    <option
                      v-for="category in selectableCategories"
                      :key="category"
                      :value="category"
                    >
                      {{ category }}
                    </option>
                  </select>
                  <i class="fas fa-chevron-down"></i>
                </div>
                <div v-if="selectedCategories.length" class="selected-category-list">
                  <button
                    v-for="category in selectedCategories"
                    :key="category"
                    type="button"
                    @click="removeCategory(category)"
                  >
                    <i class="fas fa-tag"></i>
                    {{ category }}
                    <i class="fas fa-xmark"></i>
                  </button>
                </div>
              </div>

              <div class="cover-tool">
                <div class="field-row">
                  <span>Portada del post</span>
                  <small>{{ post.image ? mediaLabel(postCoverMedia) : 'Pendiente' }}</small>
                </div>
                <div class="cover-preview-card" :class="{ empty: !post.image }">
                  <template v-if="post.image">
                    <iframe
                      v-if="postCoverMedia.type === 'youtube'"
                      :src="postCoverMedia.embedUrl"
                      title="Video de portada"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowfullscreen
                    ></iframe>
                    <video v-else-if="postCoverMedia.type === 'video'" :src="postCoverMedia.url" controls playsinline></video>
                    <img v-else :src="postCoverMedia.url" alt="Portada del post" />
                  </template>
                  <span v-else><i class="far fa-image"></i></span>
                  <button v-if="!isHeroMode" type="button" @click="openImagePicker('cover')">
                    <i class="fas fa-images"></i>
                    Cambiar media
                  </button>
                </div>
                <div class="cover-actions">
                  <button v-if="!isHeroMode" type="button" @click="openImagePicker('cover')">
                    <i class="far fa-images"></i>
                    Buscar en IGDB
                  </button>
                  <label>
                    <input v-model="post.image" placeholder="Pegar URL de imagen o video" />
                  </label>
                </div>
              </div>
            </div>
          </article>

          <article
            v-if="!isHeroMode"
            class="editor-accordion analysis-accordion"
            :class="{ locked: !isAnalysisPost || !isInitialFlowComplete, gated: !isInitialFlowComplete }"
          >
            <button type="button" class="accordion-trigger" :disabled="!isInitialFlowComplete || !isAnalysisPost" @click="toggleAccordion('analysis')">
              <span class="accordion-icon"><i class="fas fa-star-half-stroke"></i></span>
              <span>
                <strong>2. Nota analisis</strong>
                <small>{{ !isInitialFlowComplete ? initialFlowMessage : (isAnalysisPost ? 'Score, criterios y pros/contras.' : 'Disponible solo si la categoria es Analisis.') }}</small>
              </span>
              <em v-if="!isAnalysisPost" class="accordion-lock">Solo Analisis</em>
              <i :class="isAccordionOpen('analysis') ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
            </button>
            <div v-show="isAnalysisPost && isAccordionOpen('analysis')" class="accordion-body">
              <div class="analysis-editor">
                <div class="analysis-editor-head">
                  <div>
                    <span>Score del juego</span>
                    <h3>Nota del analisis</h3>
                  </div>
                </div>

                <div class="score-editor-row">
                  <div class="score-circle" aria-label="Nota final calculada">
                    <strong>{{ analysisScore }}</strong>
                  </div>
                  <div>
                    <strong>{{ scoreLabel }}</strong>
                    <div class="score-stars">
                      <i v-for="star in 5" :key="star" :class="star <= previewStars ? 'fas fa-star' : 'far fa-star'"></i>
                    </div>
                  </div>
                </div>

                <div class="analysis-criteria-grid">
                  <label v-for="item in post.analysis.criteria" :key="item.key">
                    {{ item.label }}
                    <input v-model.number="item.score" type="number" min="0" max="10" step="0.5" />
                  </label>
                </div>

                <div class="analysis-pros-cons">
                  <label>
                    Lo mejor
                    <textarea v-model="post.analysis.prosText" placeholder="Un punto por linea" />
                  </label>
                  <label>
                    Lo peor
                    <textarea v-model="post.analysis.consText" placeholder="Un punto por linea" />
                  </label>
                </div>
              </div>
            </div>
          </article>

          <article v-if="!isHeroMode" class="editor-accordion" :class="{ gated: !isInitialFlowComplete }">
            <button type="button" class="accordion-trigger" :disabled="!isInitialFlowComplete" @click="toggleAccordion('schedule')">
              <span class="accordion-icon"><i class="far fa-calendar"></i></span>
              <span>
                <strong>3. Programacion</strong>
                <small>{{ isInitialFlowComplete ? 'Fecha, prioridad y destacado.' : initialFlowMessage }}</small>
              </span>
              <i :class="isAccordionOpen('schedule') ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
            </button>
            <div v-show="isAccordionOpen('schedule')" class="accordion-body">
              <label class="release-toggle">
                <input v-model="post.publishNow" type="checkbox" />
                <span></span>
                Publicar ahora
              </label>
              <label class="field-group">
                <span>Fecha y hora de lanzamiento</span>
                <div class="input-shell">
                  <input v-model="releaseAtInput" type="datetime-local" :disabled="post.publishNow" />
                </div>
              </label>
              <div class="field-grid-2">
                <label class="field-group">
                  <span>Expiracion automatica</span>
                  <input v-model="post.expiresAtInput" type="datetime-local" />
                </label>
                <label class="field-group">
                  <span>Prioridad homepage</span>
                  <select v-model="post.homePriority">
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </label>
              </div>
              <label class="release-toggle">
                <input v-model="post.teaserVisible" type="checkbox" />
                <span></span>
                Mostrar teaser "proximamente" antes de la fecha
              </label>
            </div>
          </article>

          <article v-if="!isHeroMode" class="editor-accordion" :class="{ gated: !isInitialFlowComplete }">
            <button type="button" class="accordion-trigger" :disabled="!isInitialFlowComplete" @click="toggleAccordion('seo')">
              <span class="accordion-icon"><i class="fas fa-magnifying-glass"></i></span>
              <span>
                <strong>4. SEO y visibilidad</strong>
                <small>{{ isInitialFlowComplete ? 'Autogenerado, editable si hace falta.' : initialFlowMessage }}</small>
              </span>
              <i :class="isAccordionOpen('seo') ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
            </button>
            <div v-show="isAccordionOpen('seo')" class="accordion-body">
              <label class="field-group">
                <span>URL personalizada</span>
                <input v-model="post.slug" :placeholder="autoSlug" />
              </label>
              <label class="field-group">
                <span>Meta descripcion</span>
                <textarea v-model="post.metaDescription" :placeholder="autoMetaDescription" />
              </label>
              <div class="seo-preview">
                <small>Vista Google</small>
                <strong>{{ post.title || 'Titulo de la publicacion' }}</strong>
                <p>{{ post.metaDescription || autoMetaDescription }}</p>
              </div>
              <label class="field-group">
                <span>Keywords</span>
                <input v-model="post.keywordsText" :placeholder="autoKeywords" />
              </label>
              <div class="field-grid-2">
                <label class="field-group">
                  <span>Canonical URL</span>
                  <input v-model="post.canonicalUrl" placeholder="Opcional" />
                </label>
                <label class="field-group">
                  <span>Privacidad</span>
                  <select v-model="post.visibility">
                    <option value="public">Publico</option>
                    <option value="unlisted">Oculto</option>
                    <option value="private">Privado</option>
                  </select>
                </label>
              </div>
              <label class="release-toggle">
                <input v-model="post.indexGoogle" type="checkbox" />
                <span></span>
                Permitir indexacion Google
              </label>
            </div>
          </article>

          <article v-if="!isHeroMode" class="editor-accordion" :class="{ gated: !isInitialFlowComplete }">
            <button type="button" class="accordion-trigger" :disabled="!isInitialFlowComplete" @click="toggleAccordion('extras')">
              <span class="accordion-icon"><i class="fas fa-wand-magic-sparkles"></i></span>
              <span>
                <strong>5. Extras y gamificacion</strong>
                <small>{{ isInitialFlowComplete ? 'Puntos, badges y misiones.' : initialFlowMessage }}</small>
              </span>
              <i :class="isAccordionOpen('extras') ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
            </button>
            <div v-show="isAccordionOpen('extras')" class="accordion-body">
              <div class="field-grid-2">
                <label class="field-group">
                  <span>Puntos estrella</span>
                  <input v-model.number="post.starReward" type="number" min="0" />
                </label>
                <label class="field-group">
                  <span>Multiplicador</span>
                  <select v-model="post.rewardMultiplier">
                    <option value="1">x1</option>
                    <option value="1.5">x1.5</option>
                    <option value="2">x2</option>
                  </select>
                </label>
              </div>
              <label class="field-group">
                <span>Badges / misiones relacionadas</span>
                <input v-model="post.rewardBadgesText" placeholder="kirby-day, direct-live, guia-pro" />
              </label>
            </div>
          </article>

          <div v-if="jsonPasteError" class="json-paste-error">
            <i class="fas fa-triangle-exclamation"></i>
            {{ jsonPasteError }}
          </div>
        </section>

        <section v-if="!isHeroMode" class="editor-column content-column" :class="{ 'mobile-hidden': mobileStep !== 'sections', 'flow-locked': !isInitialFlowComplete }">
          <div class="section-editor-head">
            <div class="column-heading">
              <span>2. Secciones del post</span>
              <p>Organiza el contenido y sus imagenes.</p>
            </div>
            <button type="button" :disabled="!isInitialFlowComplete" @click="addSection">
              <i class="fas fa-plus"></i>
              Crear seccion
            </button>
          </div>
          <div v-if="!isInitialFlowComplete" class="flow-lock-card">
            <i class="fas fa-lock"></i>
            <strong>Completa la informacion principal para continuar</strong>
            <span>Titulo, resumen y portada preparan el post antes de crear secciones.</span>
          </div>

          <div class="section-stack" :aria-disabled="!isInitialFlowComplete">
            <article
              v-for="(section, index) in post.sections"
              :key="index"
              class="post-section-card"
              :class="{ active: activeSectionIndex === index, disabled: section.hidden, 'has-media': section.image }"
              :ref="element => setSectionCardRef(element, index)"
              @click="activeSectionIndex = index"
            >
              <div class="section-side-rail">
                <button type="button" title="Editar" @click.stop="activeSectionIndex = index">
                  <i class="fas fa-pen"></i>
                </button>
                <button v-if="post.sections.length > 1" type="button" class="danger" title="Eliminar" @click.stop="removeSection(index)">
                  <i class="far fa-trash-can"></i>
                </button>
                <button type="button" :disabled="index === 0" title="Subir" @click.stop="moveSection(index, -1)">
                  <i class="fas fa-arrow-up"></i>
                </button>
                <span class="drag-handle"><i class="fas fa-grip-vertical"></i></span>
                <span class="section-number">{{ index + 1 }}</span>
                <button type="button" :disabled="index === post.sections.length - 1" title="Bajar" @click.stop="moveSection(index, 1)">
                  <i class="fas fa-arrow-down"></i>
                </button>
                <button type="button" title="Duplicar" @click.stop="duplicateSection(index)">
                  <i class="far fa-copy"></i>
                </button>
              </div>

              <div class="section-copy">
                <div class="section-card-head">
                  <small>{{ section.label || sectionTypeLabel(index) }}</small>
                  <label
                    class="section-visible-toggle"
                    :class="{ hidden: section.hidden }"
                    :title="section.hidden ? 'Activar seccion' : 'Desactivar seccion'"
                    @click.stop
                  >
                    <input v-model="section.hidden" type="checkbox" />
                    <em>{{ section.hidden ? 'Oculta' : 'Activa' }}</em>
                    <span></span>
                  </label>
                </div>

                <template v-if="activeSectionIndex === index">
                  <input v-model="section.title" placeholder="Subtitulo de la seccion" />
                  <div class="writing-toolbar" aria-label="Herramientas de redaccion">
                    <button type="button" title="Negrita" @click.stop="applySectionFormat(index, 'bold')"><i class="fas fa-bold"></i></button>
                    <button type="button" title="Cursiva" @click.stop="applySectionFormat(index, 'italic')"><i class="fas fa-italic"></i></button>
                    <button type="button" title="Subrayado" @click.stop="applySectionFormat(index, 'underline')"><i class="fas fa-underline"></i></button>
                    <button type="button" title="Lista" @click.stop="applySectionFormat(index, 'list')"><i class="fas fa-list-ul"></i></button>
                    <button type="button" title="Lista numerada" @click.stop="applySectionFormat(index, 'numbered')"><i class="fas fa-list-ol"></i></button>
                    <button type="button" title="Cita" @click.stop="applySectionFormat(index, 'quote')"><i class="fas fa-quote-left"></i></button>
                    <button type="button" title="Enlace" @click.stop="applySectionFormat(index, 'link')"><i class="fas fa-link"></i></button>
                    <button type="button" title="Separador" @click.stop="applySectionFormat(index, 'divider')"><i class="fas fa-minus"></i></button>
                  </div>
                  <textarea v-model="section.content" placeholder="Contenido de esta seccion..."></textarea>
                  <div class="section-image-row">
                    <input v-model="section.image" placeholder="URL de imagen de la seccion" />
                    <button type="button" @click.stop="openImagePicker(`section-${index}`)">
                      <i class="far fa-image"></i>
                    </button>
                  </div>
                </template>

                <template v-else>
                  <strong>{{ section.title || 'Sin subtitulo todavia' }}</strong>
                  <p>{{ section.content || 'Sin contenido todavia' }}</p>
                </template>
              </div>

              <div v-if="section.image" class="section-card-media">
                <img
                  v-if="mediaFor(section.image).type === 'youtube'"
                  :src="mediaFor(section.image).thumbUrl"
                  :alt="section.title || `Seccion ${index + 1}`"
                />
                <video v-else-if="mediaFor(section.image).type === 'video'" :src="mediaFor(section.image).url" muted playsinline></video>
                <img v-else :src="mediaFor(section.image).url" :alt="section.title || `Seccion ${index + 1}`" />
                <span v-if="isVideoMedia(mediaFor(section.image))" class="media-kind-badge">
                  <i class="fas fa-play"></i>
                </span>
              </div>
            </article>
          </div>

        </section>

        <aside v-if="!isHeroMode && !previewCollapsed" class="editor-column preview-column" :class="{ 'mobile-hidden': mobileStep !== 'preview' }">
          <div class="preview-head">
            <div class="column-heading">
              <span>3. Vista previa del post</span>
              <p>Revisa como va quedando antes de publicar.</p>
            </div>
            <div class="preview-device-switch" aria-label="Vista responsive">
              <button type="button" :class="{ active: previewDevice === 'desktop' }" title="Desktop" @click="previewDevice = 'desktop'">
                <i class="fas fa-desktop"></i>
              </button>
              <button type="button" :class="{ active: previewDevice === 'tablet' }" title="Tablet" @click="previewDevice = 'tablet'">
                <i class="fas fa-tablet-screen-button"></i>
              </button>
              <button type="button" :class="{ active: previewDevice === 'mobile' }" title="Movil" @click="previewDevice = 'mobile'">
                <i class="fas fa-mobile-screen"></i>
              </button>
            </div>
            <button type="button" class="utility-btn" @click="previewCollapsed = true">
              <i class="far fa-eye-slash"></i>
              Esconder
            </button>
          </div>

          <article
            class="post-live-preview"
            :class="[
              { analysis: isAnalysisPost },
              isAnalysisPost ? `analysis-tier-${analysisTier.key}` : '',
              `preview-${previewDevice}`
            ]"
          >
            <span class="preview-category">{{ post.category || 'Categoria' }}</span>
            <h1>{{ post.title || 'Titulo de la publicacion' }}</h1>
            <p v-if="post.subtitle" class="preview-subtitle">{{ post.subtitle }}</p>
            <div class="preview-summary rich-content" v-html="richText(post.content || 'El resumen del post aparecera aqui para comprobar ritmo, longitud y contexto.')"></div>
            <div class="preview-meta">
              <span><i class="fas fa-user-circle"></i> Galaxia Nintendera</span>
              <span><i class="far fa-calendar"></i> Hoy</span>
              <span v-if="isAnalysisPost"><i class="far fa-star"></i> {{ analysisScore }}</span>
            </div>
            <div v-if="post.image" class="preview-cover preview-media">
              <iframe
                v-if="postCoverMedia.type === 'youtube'"
                :src="postCoverMedia.embedUrl"
                title="Preview video de portada"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
              <video v-else-if="postCoverMedia.type === 'video'" :src="postCoverMedia.url" controls playsinline></video>
              <img v-else :src="postCoverMedia.url" alt="Preview portada" />
            </div>
            <div v-else class="preview-cover placeholder"><i class="far fa-image"></i></div>

            <section v-for="(section, index) in visibleSections" :key="index" class="preview-section">
              <h2>{{ section.title || `Seccion ${index + 1}` }}</h2>
              <div class="preview-section-copy rich-content" v-html="richText(section.content || 'El contenido de esta seccion se vera aqui cuando lo escribas.')"></div>
              <div v-if="section.image" class="preview-section-media">
                <iframe
                  v-if="mediaFor(section.image).type === 'youtube'"
                  :src="mediaFor(section.image).embedUrl"
                  :title="section.title || `Seccion ${index + 1}`"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowfullscreen
                ></iframe>
                <video v-else-if="mediaFor(section.image).type === 'video'" :src="mediaFor(section.image).url" controls playsinline></video>
                <img v-else :src="mediaFor(section.image).url" :alt="section.title || `Seccion ${index + 1}`" />
              </div>
            </section>

            <div v-if="isAnalysisPost" class="preview-score-card">
              <strong>{{ analysisScore }}</strong>
              <span>{{ scoreLabel }}</span>
              <div>
                <small v-for="item in post.analysis.criteria" :key="item.key">
                  {{ item.label }}
                  <b>{{ item.score }}</b>
                </small>
              </div>
            </div>
          </article>
        </aside>
      </main>

      <Transition name="toast">
        <div v-if="toast.show" class="app-toast">
          <span :class="['app-toast-icon', toast.type]">
            <i :class="toast.type === 'delete' ? 'fas fa-triangle-exclamation' : 'fas fa-check'"></i>
          </span>
          <span>{{ toast.message }}</span>
        </div>
      </Transition>

      <Transition name="fade">
        <div v-if="loading" class="editor-loading-cover">
          <GalaxyLoader compact title="Guardando" text="Publicando con la pantalla de carga de la galaxia..." />
        </div>
      </Transition>

      <nav v-if="!isHeroMode" class="mobile-editor-actionbar" aria-label="Acciones del post">
        <button type="button" aria-label="Pegar JSON" title="Pegar JSON" @click="pasteJsonIntoPost">
          <i class="fas fa-code"></i>
        </button>
        <button type="button" aria-label="Guardar borrador" title="Guardar borrador" :disabled="loading" @click="savePost('draft')">
          <i class="far fa-clipboard"></i>
        </button>
        <button type="button" class="publish" :disabled="loading || !isInitialFlowComplete" @click="savePost('pending')">
          <i class="far fa-paper-plane"></i>
          {{ loading ? 'Guardando...' : 'Publicar' }}
        </button>
      </nav>

      <Transition name="fade">
        <div v-if="imagePickerOpen" class="image-picker-modal">
          <button class="image-picker-backdrop" type="button" @click="imagePickerOpen = false"></button>
          <section class="image-picker-panel">
            <header>
              <div>
                <span>IGDB</span>
                <h2>Escoger imagenes del juego</h2>
                <p>Busca el juego, revisa portadas, screenshots y artes; luego asigna cada imagen a portada o secciones.</p>
              </div>
              <button type="button" @click="imagePickerOpen = false"><i class="fas fa-xmark"></i></button>
            </header>

            <form class="igdb-search-row" @submit.prevent="searchIgdbImages">
              <input v-model="igdbQuery" placeholder="Nombre del juego, ej: Mario Kart World" />
              <button type="submit" :disabled="igdbLoading || !igdbQuery.trim()">
                <i :class="igdbLoading ? 'fas fa-circle-notch fa-spin' : 'fas fa-search'"></i>
                Buscar
              </button>
            </form>

            <div class="target-strip">
              <button
                v-for="target in imageTargets"
                :key="target.id"
                type="button"
                :class="{ active: imageTargetId === target.id, filled: target.url }"
                @click="imageTargetId = target.id"
              >
                <span>{{ target.label }}</span>
                <small>{{ target.url ? 'Asignada' : 'Sin imagen' }}</small>
              </button>
            </div>

            <div v-if="igdbImages.length" class="igdb-filter-tabs">
              <button
                v-for="filter in igdbTypeFilters"
                :key="filter.id"
                type="button"
                :class="{ active: igdbTypeFilter === filter.id }"
                @click="igdbTypeFilter = filter.id"
              >
                {{ filter.label }}
                <span>{{ filter.count }}</span>
              </button>
            </div>

            <div v-if="igdbError" class="json-paste-error">{{ igdbError }}</div>
            <div v-if="!igdbImages.length && !igdbLoading" class="igdb-empty">
              Busca un juego para cargar imagenes.
            </div>
            <div v-if="igdbLoading" class="igdb-empty">
              Buscando imagenes...
            </div>

            <div v-if="filteredIgdbImages.length" class="igdb-gallery">
              <article v-for="image in filteredIgdbImages" :key="image.id" :class="{ selected: assignedLabel(image.url) }">
                <img :src="image.url" :alt="image.typeLabel" />
                <div>
                  <span>{{ image.typeLabel }}</span>
                  <strong v-if="assignedLabel(image.url)">{{ assignedLabel(image.url) }}</strong>
                </div>
                <button type="button" @click="assignIgdbImage(image)">
                  Asignar a {{ activeImageTarget?.label || 'destino' }}
                </button>
              </article>
            </div>
            <div v-else-if="igdbImages.length && !igdbLoading" class="igdb-empty">
              No hay imagenes en esta categoria.
            </div>
          </section>
        </div>
      </Transition>
    </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { addDoc, collection, deleteField, doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { isVideoMedia, mediaFromUrl } from '@/services/mediaLinks'
import { loadPostCategories } from '@/services/postCategories'
import { READ_REWARD_STARS } from '@/services/profileProgress'
import { renderRichText } from '@/services/richText'
import { playPublishSound } from '@/services/uiSounds'
import GalaxyLoader from '@/components/shared/GalaxyLoader.vue'

const props = defineProps({
  editData: {
    type: Object,
    default: null
  },
  mode: {
    type: String,
    default: 'post'
  },
  categoryOptions: {
    type: Array,
    default: () => []
  },
  pasteJsonOnOpen: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['close', 'created'])

const loading = ref(false)
const toast = ref({ show: false, message: '', type: 'success' })
const activeSectionIndex = ref(0)
const mobileStep = ref('info')
const previewCollapsed = ref(false)
const jsonPasteError = ref('')
const imagePickerOpen = ref(false)
const imageTargetId = ref('cover')
const igdbQuery = ref('')
const igdbImages = ref([])
const igdbTypeFilter = ref('all')
const igdbLoading = ref(false)
const igdbError = ref('')
const releaseAtInput = ref('')
const openAccordions = ref(['main'])
const previewDevice = ref('desktop')
const categorySelectValue = ref('')
const adminCategories = ref([])
const sectionCardRefs = ref([])

const defaultAnalysisCriteria = [
  { key: 'historia', label: 'Historia', score: 8.5 },
  { key: 'gameplay', label: 'Gameplay', score: 9 },
  { key: 'graficos', label: 'Graficos', score: 8.5 },
  { key: 'musica', label: 'Musica', score: 8 },
  { key: 'duracion', label: 'Duracion', score: 8.5 }
]
const fallbackCategoryOptions = ['Nintendo Switch', 'Super Mario', 'Zelda', 'Pokemon', 'Rumores', 'Analisis', 'Guias']

const post = ref({
  title: '',
  subtitle: '',
  content: '',
  category: '',
  image: '',
  publicationType: 'noticia',
  tagsText: '',
  bannerImage: '',
  extraMediaText: '',
  mediaCredits: '',
  publishNow: true,
  expiresAtInput: '',
  homePriority: 'normal',
  slug: '',
  metaDescription: '',
  keywordsText: '',
  canonicalUrl: '',
  visibility: 'public',
  indexGoogle: true,
  starReward: READ_REWARD_STARS,
  rewardMultiplier: '1',
  rewardBadgesText: '',
  releaseAt: 0,
  teaserVisible: true,
  mediaGameName: '',
  sections: [{ title: '', label: 'Introduccion', image: '', content: '', hidden: false }],
  analysis: {
    score: 88,
    hypeTitle: '',
    criteria: JSON.parse(JSON.stringify(defaultAnalysisCriteria)),
    prosText: '',
    consText: ''
  }
})
const selectedCategories = ref([])

const availableCategoryOptions = computed(() => {
  const source = props.categoryOptions.length
    ? props.categoryOptions
    : (adminCategories.value.length ? adminCategories.value : fallbackCategoryOptions)
  return [...new Set([...source, ...selectedCategories.value].filter(Boolean))]
})
const canAddCategory = computed(() => isHeroMode.value || selectedCategories.value.length < 3)
const selectableCategories = computed(() => availableCategoryOptions.value.filter(category => !selectedCategories.value.includes(category)))
const isHeroMode = computed(() => props.mode === 'hero' || post.value.placement === 'hero')
const editorTitle = computed(() => {
  if (props.editData) return isHeroMode.value ? 'Editar principal' : 'Editar publicacion'
  return isHeroMode.value ? 'Crear principal de inicio' : 'Crear nueva publicacion'
})
const editorSubtitle = computed(() => (
  isHeroMode.value
    ? 'Completa el mensaje que se mostrara primero al entrar a la web.'
    : 'Construye tu post. Guarda en borrador o publicalo cuando este listo.'
))
const submitLabel = computed(() => {
  if (props.editData) return 'Guardar cambios'
  return isHeroMode.value ? 'Enviar principal a revision' : 'Publicar en la galaxia'
})
const successLabel = computed(() => (isHeroMode.value ? 'Principal enviado con exito' : 'Post publicado con exito'))
const isAnalysisPost = computed(() => selectedCategories.value.some(item => normalizeText(item) === 'analisis'))
const hasMainTitle = computed(() => Boolean(post.value.title.trim()))
const hasMainIntro = computed(() => Boolean(post.value.content.trim()))
const hasMainCover = computed(() => Boolean(String(post.value.image || '').trim()))
const isInitialFlowComplete = computed(() => isHeroMode.value || (hasMainTitle.value && hasMainIntro.value && hasMainCover.value))
const initialFlowMessage = computed(() => {
  if (!hasMainTitle.value) return 'Completa titulo, resumen y portada para continuar.'
  if (!hasMainIntro.value) return 'Completa el resumen para continuar.'
  if (!hasMainCover.value) return 'Agrega una portada para continuar.'
  return 'Completa la informacion principal para continuar.'
})
const visibleSections = computed(() => post.value.sections.filter(section => !section.hidden))
const postCoverMedia = computed(() => mediaFromUrl(post.value.image))
const mediaFor = (url) => mediaFromUrl(url)
const autoSlug = computed(() => slugify(post.value.title || ''))
const autoMetaDescription = computed(() => String(post.value.content || '').slice(0, 155))
const autoKeywords = computed(() => selectedCategories.value.map(item => item.trim()).filter(Boolean).slice(0, 8).join(', '))
const mediaLabel = (media) => {
  if (media?.type === 'youtube') return 'YouTube'
  if (media?.type === 'video') return 'Video'
  if (media?.type === 'image') return 'Imagen'
  return 'Pendiente'
}
const richText = (value) => renderRichText(value)
const analysisScore = computed(() => {
  const criteria = post.value.analysis?.criteria || []
  const validScores = criteria
    .map(item => Number(item.score))
    .filter(score => Number.isFinite(score))

  if (!validScores.length) return 0

  const average = validScores.reduce((sum, score) => sum + Math.max(0, Math.min(10, score)), 0) / validScores.length
  return Math.round(average * 10)
})
const previewStars = computed(() => {
  return Math.max(0, Math.min(5, Math.round(analysisScore.value / 20)))
})
const scoreLabel = computed(() => {
  return analysisTier.value.label
})
const analysisTier = computed(() => {
  const score = analysisScore.value
  if (score >= 90) {
    return {
      key: 'legendary',
      label: 'LEGENDARY',
      range: '90+'
    }
  }

  if (score >= 80) {
    return {
      key: 'gold',
      label: 'GOLD',
      range: '80+'
    }
  }

  return {
    key: 'review',
    label: 'REVIEW',
    range: '70+'
  }
})
const imageTargets = computed(() => [
  { id: 'cover', label: 'Portada', url: post.value.image },
  ...post.value.sections.map((section, index) => ({
    id: `section-${index}`,
    label: section.title?.trim() || `Seccion ${index + 1}`,
    url: section.image
  }))
])
const activeImageTarget = computed(() => imageTargets.value.find(target => target.id === imageTargetId.value) || imageTargets.value[0])
const igdbTypeFilters = computed(() => {
  const definitions = [
    { id: 'all', label: 'Todo' },
    { id: 'cover', label: 'Caratulas' },
    { id: 'screenshot', label: 'Gameplay' },
    { id: 'artwork', label: 'Arte' }
  ]
  return definitions.map(filter => ({
    ...filter,
    count: filter.id === 'all'
      ? igdbImages.value.length
      : igdbImages.value.filter(image => image.type === filter.id).length
  }))
})
const filteredIgdbImages = computed(() => {
  if (igdbTypeFilter.value === 'all') return igdbImages.value
  return igdbImages.value.filter(image => image.type === igdbTypeFilter.value)
})

const toLocalDateTimeInput = (value) => {
  const time = typeof value === 'number' ? value : (value?.toDate?.().getTime?.() || new Date(value || '').getTime())
  if (!Number.isFinite(time) || !time) return ''
  const date = new Date(time)
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}

onMounted(async () => {
  if (!props.categoryOptions.length) {
    adminCategories.value = await loadPostCategories()
  }

  if (props.editData) {
    post.value = {
      ...post.value,
      ...JSON.parse(JSON.stringify(props.editData))
    }
    post.value.subtitle = post.value.subtitle || ''
    post.value.publicationType = post.value.publicationType || 'noticia'
    post.value.tagsText = Array.isArray(post.value.tags) ? post.value.tags.join(', ') : (post.value.tagsText || '')
    post.value.extraMediaText = Array.isArray(post.value.extraMedia) ? post.value.extraMedia.join('\n') : (post.value.extraMediaText || '')
    post.value.keywordsText = Array.isArray(post.value.keywords) ? post.value.keywords.join(', ') : (post.value.keywordsText || '')
    post.value.rewardBadgesText = Array.isArray(post.value.rewardBadges) ? post.value.rewardBadges.join(', ') : (post.value.rewardBadgesText || '')
    post.value.publishNow = post.value.publishNow !== false
    post.value.visibility = post.value.visibility || 'public'
    post.value.indexGoogle = post.value.indexGoogle !== false
    post.value.homePriority = post.value.homePriority || 'normal'
    post.value.starReward = Number(post.value.starReward || READ_REWARD_STARS)
    post.value.rewardMultiplier = String(post.value.rewardMultiplier || '1')
    releaseAtInput.value = toLocalDateTimeInput(post.value.releaseAt || post.value.scheduledAt)
    post.value.teaserVisible = post.value.teaserVisible !== false
    post.value.sections = normalizeSections(post.value.sections?.length ? post.value.sections : post.value.sections)
    ensureAnalysisData()
    const savedCategories = Array.isArray(post.value.categories) && post.value.categories.length
      ? post.value.categories
      : (post.value.category ? [post.value.category] : [])
    selectedCategories.value = savedCategories.filter(Boolean).slice(0, 3)
  } else {
    post.value.teaserVisible = true
    selectedCategories.value = props.mode === 'hero' ? [availableCategoryOptions.value[0] || 'Nintendo Switch'] : []
    if (props.pasteJsonOnOpen && !isHeroMode.value) {
      nextTick(() => pasteJsonIntoPost())
    }
  }
})

watch(selectedCategories, (categories) => {
  post.value.categories = categories
  post.value.category = categories[0] || ''
  if (isAnalysisPost.value) {
    ensureAnalysisData()
  } else {
    if (openAccordions.value[0] === 'analysis') openAccordions.value = ['main']
  }
}, { deep: true, immediate: true })

watch(isInitialFlowComplete, (complete) => {
  if (complete || isHeroMode.value) return
  openAccordions.value = ['main']
  mobileStep.value = 'info'
})

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()

const ensureAnalysisData = () => {
  post.value.analysis = {
    score: Number(post.value.analysis?.score ?? 88),
    hypeTitle: post.value.analysis?.hypeTitle || '',
    criteria: post.value.analysis?.criteria?.length
      ? post.value.analysis.criteria.map((item, index) => ({
          key: item.key || defaultAnalysisCriteria[index]?.key || `criteria-${index}`,
          label: item.label || defaultAnalysisCriteria[index]?.label || 'Criterio',
          score: Number(item.score ?? defaultAnalysisCriteria[index]?.score ?? 8)
        }))
      : JSON.parse(JSON.stringify(defaultAnalysisCriteria)),
    prosText: post.value.analysis?.prosText || (post.value.analysis?.pros || []).join('\n'),
    consText: post.value.analysis?.consText || (post.value.analysis?.cons || []).join('\n')
  }
}

const toggleCategory = (category) => {
  const hasCategory = selectedCategories.value.includes(category)
  if (isHeroMode.value) {
    selectedCategories.value = hasCategory ? [] : [category]
    return
  }
  if (hasCategory) {
    selectedCategories.value = selectedCategories.value.filter(item => item !== category)
    return
  }
  if (selectedCategories.value.length >= 3) return
  selectedCategories.value = [...selectedCategories.value, category]
}

const addSelectedCategory = () => {
  const category = categorySelectValue.value
  if (!category) return
  toggleCategory(category)
  categorySelectValue.value = ''
}

const removeCategory = (category) => {
  selectedCategories.value = selectedCategories.value.filter(item => item !== category)
}

const isAccordionOpen = (key) => openAccordions.value.includes(key)

const toggleAccordion = (key) => {
  if (!isInitialFlowComplete.value) {
    openAccordions.value = ['main']
    return
  }
  if (key === 'analysis' && !isAnalysisPost.value) return
  openAccordions.value = isAccordionOpen(key) ? [] : [key]
}

const slugify = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')

const applySectionFormat = (index, type) => {
  const section = post.value.sections[index]
  if (!section) return

  const snippets = {
    bold: '**texto destacado**',
    italic: '_texto en cursiva_',
    underline: '<u>texto subrayado</u>',
    list: '\n- Punto importante',
    numbered: '\n1. Primer punto',
    quote: '\n> Cita o dato clave',
    link: '[texto del enlace](https://)',
    divider: '\n---\n'
  }

  section.content = `${section.content || ''}${section.content ? ' ' : ''}${snippets[type] || ''}`.trimStart()
}

const sectionTypeLabel = (index) => {
  const labels = ['Introduccion', 'Historia', 'Gameplay', 'Aspectos destacados', 'Conclusion']
  return labels[index] || `Seccion ${index + 1}`
}

const addSection = async () => {
  if (!isInitialFlowComplete.value) {
    openAccordions.value = ['main']
    showEditorToast('Completa la informacion principal para crear secciones', 'delete')
    return
  }
  post.value.sections.push({ title: '', label: sectionTypeLabel(post.value.sections.length), image: '', content: '', hidden: false })
  activeSectionIndex.value = post.value.sections.length - 1
  mobileStep.value = 'sections'
  await nextTick()
  scrollSectionIntoView(activeSectionIndex.value)
}

const setSectionCardRef = (element, index) => {
  if (element) sectionCardRefs.value[index] = element
}

const scrollSectionIntoView = (index) => {
  window.requestAnimationFrame(() => {
    sectionCardRefs.value[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    })
  })
}

const removeSection = (index) => {
  if (post.value.sections.length <= 1) return
  post.value.sections.splice(index, 1)
  activeSectionIndex.value = Math.min(activeSectionIndex.value, post.value.sections.length - 1)
}

const duplicateSection = (index) => {
  const source = post.value.sections[index]
  post.value.sections.splice(index + 1, 0, { ...JSON.parse(JSON.stringify(source)), title: `${source.title || 'Seccion'} copia` })
  activeSectionIndex.value = index + 1
}

const moveSection = (index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= post.value.sections.length) return
  const [section] = post.value.sections.splice(index, 1)
  post.value.sections.splice(targetIndex, 0, section)
  activeSectionIndex.value = targetIndex
}

const showEditorToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 2500)
}

const normalizeSections = (sections = [], { dropEmpty = false } = {}) => {
  const normalized = sections.map((section, index) => ({
    title: section?.title || section?.subtitulo || '',
    label: section?.label || section?.type || sectionTypeLabel(index),
    image: section?.image || section?.imagen || '',
    content: section?.content || section?.contenido || '',
    hidden: Boolean(section?.hidden)
  }))
  const filtered = dropEmpty
    ? normalized.filter(section => section.title.trim() || section.image.trim() || section.content.trim())
    : normalized
  return filtered.length ? filtered : [{ title: '', label: 'Introduccion', image: '', content: '', hidden: false }]
}

const parseAiJsonPost = (value) => {
  const data = JSON.parse(value || '{}')
  const title = String(data?.title || data?.titulo || '').trim()
  const subtitle = String(data?.subtitle || data?.subtitulo || '').trim()
  const summary = String(data?.summary ?? data?.resumen ?? data?.content ?? '').trim()
  const categories = Array.isArray(data?.categories)
    ? data.categories.map(item => String(item || '').trim()).filter(Boolean)
    : []
  const category = String(data?.category || data?.categoria || categories[0] || '').trim()

  if (!title) throw new Error('El JSON no tiene title/titulo.')
  if (!summary) throw new Error('El JSON no tiene summary/resumen.')
  if (!category && !categories.length) throw new Error('El JSON no tiene category/categoria o categories.')

  const sectionsSource = Array.isArray(data?.sections)
    ? data.sections
    : (Array.isArray(data?.secciones) ? data.secciones : [])
  const mergedCategories = [...new Set([category, ...categories].filter(Boolean))]

  return {
    title,
    subtitle,
    content: summary,
    image: String(data?.image || data?.imagen || '').trim(),
    categories: mergedCategories,
    sections: normalizeSections(sectionsSource),
    analysis: data?.analysis || data?.analisis || {},
    score: Number(data?.score || data?.nota || data?.analysis?.score || data?.analisis?.score || 0),
    pros: Array.isArray(data?.pros) ? data.pros : [],
    cons: Array.isArray(data?.cons) ? data.cons : []
  }
}

const pasteJsonIntoPost = async () => {
  jsonPasteError.value = ''
  try {
    const text = await navigator.clipboard.readText()
    const parsed = parseAiJsonPost(text)
    post.value.title = parsed.title
    post.value.subtitle = parsed.subtitle
    post.value.content = parsed.content
    post.value.image = parsed.image
    post.value.sections = parsed.sections
    selectedCategories.value = parsed.categories.slice(0, 3)
    activeSectionIndex.value = 0

    if (isAnalysisPost.value) {
      ensureAnalysisData()
      post.value.analysis.score = parsed.score || post.value.analysis.score
      post.value.analysis.hypeTitle = parsed.analysis?.hypeTitle || parsed.analysis?.titulo || parsed.title
      post.value.analysis.prosText = parsed.pros.join('\n') || post.value.analysis.prosText
      post.value.analysis.consText = parsed.cons.join('\n') || post.value.analysis.consText
    }
    showEditorToast('JSON pegado en el editor')
  } catch (error) {
    console.error(error)
    jsonPasteError.value = error.message || 'No pude pegar el JSON. Copialo otra vez y reintenta.'
  }
}

const openImagePicker = (targetId = 'cover') => {
  imageTargetId.value = targetId
  imagePickerOpen.value = true
  igdbError.value = ''
  igdbQuery.value = post.value.mediaGameName || post.value.title || ''
}

const searchIgdbImages = async () => {
  const query = igdbQuery.value.trim()
  if (!query) return
  igdbLoading.value = true
  igdbError.value = ''
  try {
    const response = await fetch('/.netlify/functions/igdb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.error || 'No se pudieron buscar imagenes')
    igdbImages.value = data.images || []
    igdbTypeFilter.value = 'all'
    post.value.mediaGameName = data.game?.name || query
  } catch (error) {
    console.error(error)
    igdbError.value = error.message || 'No se pudieron buscar imagenes'
  } finally {
    igdbLoading.value = false
  }
}

const assignIgdbImage = (image) => {
  if (!image?.url) return
  if (imageTargetId.value === 'cover') {
    post.value.image = image.url
  } else if (imageTargetId.value.startsWith('section-')) {
    const index = Number(imageTargetId.value.replace('section-', ''))
    if (post.value.sections[index]) post.value.sections[index].image = image.url
  }
  showEditorToast(`Imagen asignada a ${activeImageTarget.value?.label || 'destino'}`)
}

const assignedLabel = (url) => {
  const target = imageTargets.value.find(item => item.url === url)
  return target?.label || ''
}

const savePost = async (targetStatus = 'pending') => {
  if (!post.value.title.trim()) return alert('El titulo es obligatorio')
  if (targetStatus !== 'draft' && !isInitialFlowComplete.value) {
    openAccordions.value = ['main']
    return alert('Completa titulo, resumen y portada antes de publicar.')
  }
  if (!selectedCategories.value.length) return alert('Selecciona al menos una categoria')

  loading.value = true
  try {
    const user = auth.currentUser
    const cleanPost = JSON.parse(JSON.stringify(post.value))
    delete cleanPost.stickers
    cleanPost.sections = normalizeSections(cleanPost.sections, { dropEmpty: !isHeroMode.value })
    cleanPost.categories = selectedCategories.value
    cleanPost.category = selectedCategories.value[0]
    cleanPost.tags = String(cleanPost.tagsText || '').split(',').map(item => item.trim()).filter(Boolean)
    cleanPost.extraMedia = String(cleanPost.extraMediaText || '').split('\n').map(item => item.trim()).filter(Boolean)
    cleanPost.keywords = String(cleanPost.keywordsText || autoKeywords.value).split(',').map(item => item.trim()).filter(Boolean)
    cleanPost.rewardBadges = String(cleanPost.rewardBadgesText || '').split(',').map(item => item.trim()).filter(Boolean)
    cleanPost.starReward = Number(cleanPost.starReward || READ_REWARD_STARS)
    cleanPost.rewardMultiplier = String(cleanPost.rewardMultiplier || '1')
    cleanPost.slug = String(cleanPost.slug || autoSlug.value).trim()
    cleanPost.metaDescription = String(cleanPost.metaDescription || autoMetaDescription.value).trim()
    cleanPost.placement = isHeroMode.value ? 'hero' : 'news'
    cleanPost.isMainEntry = isHeroMode.value
    const releaseAt = cleanPost.publishNow ? 0 : (releaseAtInput.value ? new Date(releaseAtInput.value).getTime() : 0)
    const expiresAt = cleanPost.expiresAtInput ? new Date(cleanPost.expiresAtInput).getTime() : 0
    cleanPost.releaseAt = Number.isFinite(releaseAt) ? releaseAt : 0
    cleanPost.expiresAt = Number.isFinite(expiresAt) ? expiresAt : 0
    cleanPost.teaserVisible = cleanPost.teaserVisible !== false
    delete cleanPost.tagsText
    delete cleanPost.extraMediaText
    delete cleanPost.keywordsText
    delete cleanPost.rewardBadgesText
    delete cleanPost.expiresAtInput

    if (!isHeroMode.value && isAnalysisPost.value) {
      cleanPost.analysis = {
        ...cleanPost.analysis,
        score: analysisScore.value,
        hypeTitle: String(cleanPost.analysis?.hypeTitle || '').trim(),
        pros: String(cleanPost.analysis?.prosText || '').split('\n').map(item => item.trim()).filter(Boolean),
        cons: String(cleanPost.analysis?.consText || '').split('\n').map(item => item.trim()).filter(Boolean)
      }
    } else {
      delete cleanPost.analysis
    }

    if (isHeroMode.value) cleanPost.sections = []

    if (props.editData) {
      await updateDoc(doc(db, 'posts', props.editData.id), {
        ...cleanPost,
        stickers: deleteField(),
        updatedAt: Date.now()
      })
    } else {
      await addDoc(collection(db, 'posts'), {
        ...cleanPost,
        authorId: user?.uid || 'anon',
        authorName: user?.displayName || 'Admin',
        status: targetStatus === 'draft' ? 'draft' : 'pending',
        createdAt: Date.now()
      })
    }

    showEditorToast(props.editData ? 'Cambios guardados' : successLabel.value)
    playPublishSound()
    if (!props.editData) {
      window.dispatchEvent(new CustomEvent('mascot-reaction', {
        detail: {
          type: isHeroMode.value ? 'heroCreated' : 'postCreated',
          message: isHeroMode.value ? 'Nuevo principal listo para brillar.' : 'Que gran post acaba de nacer.'
        }
      }))
    }
    setTimeout(() => {
      emit('created')
      emit('close')
    }, 900)
  } catch (error) {
    console.error(error)
    alert('Error al guardar')
    loading.value = false
  }
}
</script>

<style scoped>
.post-editor-modal {
  align-items: center;
  background:
    radial-gradient(circle at 20% 10%, rgba(147, 51, 234, 0.24), transparent 30%),
    rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(14px);
  display: flex;
  inset: 0;
  justify-content: center;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 28px;
  position: fixed;
  z-index: 7000;
}

.post-editor-panel {
  background: #ffffff;
  border:
    1px solid
    rgba(168, 85, 247, 0.28);
  border-radius: 22px;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.5);
  color: #111827;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  height: calc(100dvh - 56px);
  max-height: calc(100dvh - 56px);
  max-width: min(1880px, 90vw);
  overflow: hidden;
  width: min(1880px, 90vw);
}

.hero-editor-panel {
  max-width: min(820px, calc(100vw - 36px));
}

.editor-topbar {
  align-items: center;
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1px solid #eef2f7;
  display: grid;
  gap: 16px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 14px 18px;
  position: sticky;
  top: 0;
  z-index: 20;
}

.editor-title-block h2 {
  color: #111827;
  font-size: 20px;
  font-weight: 950;
  line-height: 1.15;
}

.editor-title-block i,
.column-heading span,
.score-stars {
  color: #a855f7;
}

.editor-title-block p,
.column-heading p,
.field-help {
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.4;
}

.editor-actions-top,
.cover-actions,
.field-row,
.preview-head,
.section-editor-head,
.section-card-head,
.score-editor-row {
  align-items: center;
  display: flex;
  gap: 10px;
}

.back-btn,
.utility-btn,
.draft-btn,
.publish-top-btn,
.panel-close-btn {
  align-items: center;
  border-radius: 12px;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 8px;
  justify-content: center;
  min-height: 40px;
  padding: 0 14px;
}

.back-btn,
.utility-btn,
.draft-btn {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #475569;
}

.utility-btn:hover,
.draft-btn:hover,
.back-btn:hover {
  border-color: #c4b5fd;
  color: #7c3aed;
}

.publish-top-btn {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  color: #ffffff;
}

.panel-close-btn {
  background: #f8fafc;
  color: #94a3b8;
  height: 40px;
  padding: 0;
  width: 40px;
}

.mobile-stepper {
  display: none;
}

.editor-accordion {
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid #eef2f7;
  border-radius: 16px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  transition: box-shadow 0.2s ease, min-height 0.2s ease;
}

.main-accordion {
  border-color: rgba(168, 85, 247, 0.22);
  box-shadow: 0 18px 48px rgba(147, 51, 234, 0.08);
}

.main-accordion.incomplete {
  background:
    radial-gradient(circle at top right, rgba(236, 72, 153, 0.1), transparent 34%),
    linear-gradient(180deg, #ffffff, #fbf8ff);
  border-color: rgba(168, 85, 247, 0.34);
}

.main-accordion .accordion-trigger {
  min-height: 74px;
  padding: 17px;
}

.main-accordion .accordion-icon {
  height: 42px;
  width: 42px;
}

.main-accordion .accordion-trigger strong {
  font-size: 15px;
}

.main-accordion .accordion-trigger small {
  font-size: 12px;
}

.editor-accordion:has(.accordion-body:not([style*='display: none'])) {
  background: #ffffff;
  box-shadow: 0 20px 54px rgba(15, 23, 42, 0.08);
}

.editor-accordion:not(:has(.accordion-body:not([style*='display: none']))) {
  box-shadow: none;
}

.info-column:has(.accordion-body:not([style*='display: none'])) .editor-accordion:not(:has(.accordion-body:not([style*='display: none']))) {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(248, 250, 252, 0.72));
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035);
  opacity: 0.9;
}

.info-column:has(.accordion-body:not([style*='display: none'])) .editor-accordion:not(:has(.accordion-body:not([style*='display: none']))) .accordion-trigger {
  min-height: 58px;
  padding-block: 11px;
}

.accordion-trigger {
  align-items: center;
  color: #111827;
  display: grid;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  padding: 13px;
  text-align: left;
  width: 100%;
}

.accordion-trigger:disabled {
  cursor: not-allowed;
}

.accordion-trigger strong {
  display: block;
  font-size: 13px;
  font-weight: 950;
}

.accordion-trigger small {
  color: #64748b;
  display: block;
  font-size: 11px;
  font-weight: 750;
  margin-top: 2px;
}

.accordion-icon {
  align-items: center;
  background: #f3e8ff;
  border-radius: 12px;
  color: #9333ea;
  display: flex;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.accordion-lock {
  background: #f3e8ff;
  border-radius: 999px;
  color: #9333ea;
  font-size: 10px;
  font-style: normal;
  font-weight: 950;
  padding: 5px 8px;
  white-space: nowrap;
}

.start-badge {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 999px;
  box-shadow: 0 12px 24px rgba(236, 72, 153, 0.22);
  color: #ffffff;
  font-size: 10px;
  font-style: normal;
  font-weight: 950;
  padding: 6px 10px;
  white-space: nowrap;
}

.editor-accordion.gated {
  background: rgba(248, 250, 252, 0.72);
  border-color: rgba(226, 232, 240, 0.8);
  filter: saturate(0.82);
  opacity: 0.62;
}

.editor-accordion.gated .accordion-icon {
  background: #f1f5f9;
  color: #94a3b8;
}

.editor-accordion.gated .accordion-lock {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #94a3b8;
}

.accordion-body {
  border-top: 1px solid #f1f5f9;
  display: grid;
  gap: 18px;
  min-height: 0;
  overflow: visible;
  padding: 17px;
}

.field-grid-2 {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.featured-field .input-shell {
  min-height: 48px;
}

.summary-field .textarea-shell {
  align-items: stretch;
  background: linear-gradient(180deg, #ffffff, #fbfdff);
  border-radius: 16px;
  min-height: 148px;
  padding: 12px 14px;
}

.summary-field textarea {
  font-size: 14px;
  line-height: 1.55;
  min-height: 116px;
}

.seo-preview {
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  display: grid;
  gap: 4px;
  padding: 12px;
}

.seo-preview small {
  color: #9333ea;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.seo-preview strong {
  color: #1d4ed8;
  font-size: 14px;
  font-weight: 900;
}

.seo-preview p {
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.45;
}

.mobile-editor-actionbar {
  display: none;
}

.flow-locked {
  position: relative;
}

.flow-locked .section-stack {
  filter: blur(0.4px);
  opacity: 0.28;
  pointer-events: none;
}

.flow-locked .section-editor-head button,
.publish-top-btn:disabled,
.mobile-editor-actionbar .publish:disabled,
.mobile-stepper button:disabled {
  cursor: not-allowed;
  filter: saturate(0.7);
  opacity: 0.48;
}

.flow-lock-card {
  align-items: center;
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.09), rgba(236, 72, 153, 0.08));
  border: 1px solid #eadcff;
  border-radius: 18px;
  color: #475569;
  display: grid;
  gap: 6px;
  justify-items: center;
  margin: 4px 0 10px;
  padding: 24px;
  text-align: center;
}

.flow-lock-card i {
  align-items: center;
  background: #f3e8ff;
  border-radius: 999px;
  color: #9333ea;
  display: flex;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.flow-lock-card strong {
  color: #111827;
  font-size: 15px;
  font-weight: 950;
}

.flow-lock-card span {
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
  max-width: 360px;
}

.editor-layout {
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(320px, 0.62fr) minmax(720px, 1.62fr) minmax(380px, 0.82fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 22px 26px;
}

.preview-collapsed .editor-layout {
  grid-template-columns: minmax(320px, 0.52fr) minmax(860px, 1.88fr);
}

.hero-editor-layout {
  grid-template-columns: 1fr;
}

.editor-column {
  align-content: start;
  display: grid;
  gap: 18px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.info-column {
  align-content: start;
  grid-auto-rows: max-content;
  max-height: 100%;
  min-height: 0;
  overscroll-behavior: contain;
  padding-bottom: 42px;
  scroll-padding-bottom: 42px;
  scrollbar-gutter: stable;
  overflow-y: scroll;
}

.column-heading span {
  display: block;
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}

.field-group {
  display: grid;
  gap: 8px;
}

.field-group > span,
.field-row span {
  color: #334155;
  font-size: 12px;
  font-weight: 950;
}

.field-row {
  justify-content: space-between;
}

.field-row small {
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
}

.input-shell {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: flex;
  gap: 10px;
  min-height: 44px;
  padding: 0 12px;
}

.input-shell:focus-within {
  border-color: #c084fc;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.12);
}

.input-shell input,
.input-shell textarea,
.field-group > input,
.field-group > textarea,
.field-group > select,
.cover-actions input,
.section-copy input,
.section-copy textarea,
.igdb-search-row input {
  background: transparent;
  color: #111827;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  outline: none;
  width: 100%;
}

.input-shell small {
  color: #94a3b8;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 800;
}

.textarea-shell {
  align-items: stretch;
  min-height: 104px;
  padding: 12px;
}

.textarea-shell textarea {
  resize: none;
}

.category-combobox {
  position: relative;
}

.category-combobox select {
  appearance: none;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #111827;
  font-size: 13px;
  font-weight: 900;
  min-height: 44px;
  outline: none;
  padding: 0 38px 0 12px;
  width: 100%;
}

.category-combobox select:focus {
  border-color: #c084fc;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.12);
}

.category-combobox i {
  color: #94a3b8;
  pointer-events: none;
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
}

.selected-category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-category-list button {
  align-items: center;
  background: #f3e8ff;
  border: 1px solid #e9d5ff;
  border-radius: 999px;
  color: #7c3aed;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 6px;
  min-height: 32px;
  padding: 0 10px;
}

.cover-tool {
  display: grid;
  gap: 10px;
}

.cover-preview-card {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  min-height: 150px;
  overflow: hidden;
  position: relative;
}

.cover-preview-card img,
.cover-preview-card iframe,
.cover-preview-card video {
  border: 0;
  display: block;
  height: 100%;
  min-height: 150px;
  object-fit: cover;
  width: 100%;
}

.field-group > input,
.field-group > textarea,
.field-group > select {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  min-height: 42px;
  padding: 0 12px;
}

.field-group > textarea {
  min-height: 92px;
  padding: 12px;
  resize: vertical;
}

.field-group > input:focus,
.field-group > textarea:focus,
.field-group > select:focus {
  border-color: #c084fc;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.12);
}

.cover-preview-card.empty {
  display: grid;
  place-items: center;
}

.cover-preview-card > span {
  color: #a78bfa;
  font-size: 28px;
}

.cover-preview-card button {
  background: rgba(15, 23, 42, 0.72);
  border-radius: 10px;
  bottom: 10px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  left: 10px;
  padding: 8px 12px;
  position: absolute;
}

.cover-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.cover-actions button,
.cover-actions label {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #7c3aed;
  display: flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 42px;
  justify-content: center;
  padding: 0 12px;
}

.json-paste-error {
  align-items: center;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 12px;
  color: #be123c;
  display: flex;
  font-size: 12px;
  font-weight: 850;
  gap: 8px;
  padding: 10px 12px;
}

.analysis-editor {
  background:
    radial-gradient(circle at 88% 0%, rgba(236, 72, 153, 0.09), transparent 34%),
    linear-gradient(135deg, #faf5ff, #fff7ed);
  border: 1px solid #e9d5ff;
  border-radius: 18px;
  display: grid;
  gap: 16px;
  padding: 18px;
}

.analysis-accordion .accordion-body {
  padding: 0;
}

.analysis-accordion .analysis-editor {
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.analysis-accordion.locked {
  cursor: not-allowed;
}

.analysis-accordion.locked .accordion-trigger {
  cursor: not-allowed;
}

.analysis-accordion.locked .accordion-icon {
  color: #94a3b8;
}

.release-editor {
  background: linear-gradient(135deg, #f5f3ff, #eef2ff);
  border: 1px solid #ddd6fe;
  border-radius: 18px;
  display: grid;
  gap: 12px;
  padding: 16px;
}

.release-toggle {
  align-items: center;
  color: #475569;
  cursor: pointer;
  display: flex;
  font-size: 12px;
  font-weight: 900;
  gap: 9px;
}

.release-toggle input {
  display: none;
}

.release-toggle span {
  background: #cbd5e1;
  border-radius: 999px;
  height: 20px;
  position: relative;
  width: 38px;
}

.release-toggle span::after {
  background: #ffffff;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.2);
  content: '';
  height: 16px;
  left: 2px;
  position: absolute;
  top: 2px;
  transition: transform 0.2s ease;
  width: 16px;
}

.release-toggle input:checked + span {
  background: #9333ea;
}

.release-toggle input:checked + span::after {
  transform: translateX(18px);
}

.analysis-editor-head {
  justify-content: space-between;
}

.analysis-editor-head span {
  color: #7c3aed;
  font-size: 11px;
  font-weight: 950;
}

.analysis-editor-head h3 {
  color: #111827;
  font-size: 18px;
  font-weight: 950;
}

.score-editor-row {
  align-items: center;
  background: rgba(255, 255, 255, 0.64);
  border: 1px solid rgba(233, 213, 255, 0.8);
  border-radius: 16px;
  gap: 14px;
  justify-content: start;
  padding: 12px;
}

.score-circle {
  align-items: center;
  border: 4px solid #a855f7;
  border-radius: 999px;
  display: flex;
  height: 74px;
  justify-content: center;
  width: 74px;
}

.score-circle strong {
  background: transparent;
  color: #111827;
  font-size: 24px;
  font-weight: 950;
  line-height: 1;
  text-align: center;
}

.score-editor-row > div > strong {
  color: #9333ea;
  font-weight: 950;
}

.analysis-criteria-grid label,
.analysis-pros-cons label {
  color: #475569;
  display: grid;
  font-size: 11px;
  font-weight: 900;
  gap: 6px;
}

.analysis-criteria-grid input,
.analysis-pros-cons textarea {
  background: #ffffff;
  border: 1px solid #e9d5ff;
  border-radius: 12px;
  color: #111827;
  min-height: 42px;
  outline: none;
  padding: 10px 12px;
}

.analysis-criteria-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.analysis-criteria-grid label {
  align-items: center;
  background: rgba(255, 255, 255, 0.64);
  border: 1px solid rgba(233, 213, 255, 0.78);
  border-radius: 14px;
  grid-template-columns: minmax(0, 1fr) 72px;
  min-height: 54px;
  padding: 8px 10px;
}

.analysis-criteria-grid input {
  font-weight: 950;
  min-height: 38px;
  padding: 0 10px;
  text-align: center;
}

.analysis-pros-cons {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
}

.analysis-pros-cons label {
  background: rgba(255, 255, 255, 0.64);
  border: 1px solid rgba(233, 213, 255, 0.78);
  border-radius: 16px;
  padding: 12px;
}

.analysis-pros-cons textarea {
  min-height: 96px;
  resize: vertical;
}

.section-editor-head {
  justify-content: space-between;
}

.content-column {
  background: rgba(248, 250, 252, 0.72);
  border: 1px solid #eef2f7;
  border-radius: 20px;
  padding: 18px;
}

.section-editor-head > button {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
  min-height: 42px;
  padding: 0 16px;
}

.section-stack {
  display: grid;
  gap: 12px;
}

.post-section-card {
  align-items: stretch;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 16px;
  cursor: pointer;
  display: grid;
  gap: 18px;
  grid-template-columns: 52px minmax(0, 1fr);
  min-height: 104px;
  padding: 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
}

.post-section-card.has-media {
  grid-template-columns: 52px minmax(0, 1fr) minmax(180px, 260px);
}

.post-section-card.active {
  gap: 18px;
  grid-template-columns: 52px minmax(0, 1fr);
  min-height: 260px;
  padding: 16px;
}

.post-section-card.active.has-media {
  grid-template-columns: 52px minmax(0, 1fr) minmax(220px, 340px);
}

.post-section-card:not(.active) {
  gap: 12px;
  grid-template-columns: 38px minmax(0, 1fr);
  min-height: 88px;
  padding: 12px;
}

.post-section-card:not(.active).has-media {
  grid-template-columns: 38px minmax(0, 1fr) minmax(130px, 180px);
}

.post-section-card:hover {
  transform: translateY(-1px);
}

.post-section-card.active {
  border-color: #c084fc;
  box-shadow: 0 16px 38px rgba(124, 58, 237, 0.1);
}

.post-section-card.disabled {
  opacity: 0.58;
}

.section-side-rail {
  align-content: center;
  display: grid;
  gap: 6px;
  justify-items: center;
  min-height: 100%;
}

.post-section-card:not(.active) .section-side-rail {
  align-content: center;
  gap: 0;
}

.post-section-card:not(.active) .section-side-rail button,
.post-section-card:not(.active) .section-side-rail .drag-handle {
  display: none;
}

.section-side-rail button {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  color: #334155;
  display: flex;
  height: 34px;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-4px);
  transition: opacity 0.18s ease, transform 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  width: 34px;
}

.post-section-card:hover .section-side-rail button,
.post-section-card.active .section-side-rail button {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}

.section-side-rail button:hover {
  border-color: #c084fc;
  color: #9333ea;
}

.section-side-rail button:disabled {
  opacity: 0.28;
  pointer-events: none;
}

.section-side-rail .danger {
  color: #ef4444;
}

.drag-handle {
  color: #94a3b8;
  cursor: grab;
  display: grid;
  font-size: 18px;
  height: 24px;
  place-items: center;
}

.section-number {
  align-items: center;
  background: #f3e8ff;
  border-radius: 999px;
  color: #a855f7;
  display: flex;
  font-size: 12px;
  font-weight: 950;
  height: 28px;
  justify-content: center;
  width: 28px;
}

.section-copy {
  align-content: start;
  display: grid;
  gap: 10px;
  min-width: 0;
}

.section-card-head {
  justify-content: space-between;
}

.post-section-card:not(.active) .section-card-head {
  gap: 8px;
}

.section-card-head small {
  background: #f3e8ff;
  border-radius: 999px;
  color: #a855f7;
  font-size: 10px;
  font-weight: 950;
  padding: 4px 8px;
  text-transform: uppercase;
}

.section-visible-toggle input {
  display: none;
}

.section-visible-toggle {
  align-items: center;
  color: #16a34a;
  cursor: pointer;
  display: inline-flex;
  gap: 7px;
  min-width: 78px;
}

.post-section-card:not(.active) .section-visible-toggle {
  min-width: auto;
}

.post-section-card:not(.active) .section-visible-toggle em {
  display: none;
}

.post-section-card:not(.active) .section-visible-toggle span {
  height: 14px;
  width: 28px;
}

.section-visible-toggle em {
  font-size: 10px;
  font-style: normal;
  font-weight: 950;
  text-transform: uppercase;
}

.section-visible-toggle span {
  background: #22c55e;
  border-radius: 999px;
  display: block;
  height: 18px;
  width: 34px;
}

.section-visible-toggle.hidden {
  color: #94a3b8;
}

.section-visible-toggle input:checked + em + span {
  background: #cbd5e1;
}

.section-copy input,
.section-copy textarea,
.section-image-row {
  background: #ffffff;
  border: 1px solid #e9edf5;
  border-radius: 12px;
  padding: 10px 12px;
  width: 100%;
}

.writing-toolbar {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e9edf5;
  border-radius: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px;
}

.writing-toolbar button {
  align-items: center;
  border-radius: 9px;
  color: #475569;
  display: inline-flex;
  height: 30px;
  justify-content: center;
  transition: background 0.18s ease, color 0.18s ease;
  width: 30px;
}

.writing-toolbar button:hover {
  background: #f3e8ff;
  color: #9333ea;
}

.section-copy textarea {
  min-height: 128px;
  resize: vertical;
}

.section-copy strong {
  color: #111827;
  font-size: 15px;
  font-weight: 950;
}

.post-section-card:not(.active) .section-copy {
  align-content: center;
  gap: 6px;
}

.post-section-card:not(.active) .section-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-copy p {
  color: #64748b;
  display: -webkit-box;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.45;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.post-section-card:not(.active) .section-copy p {
  line-height: 1.35;
  -webkit-line-clamp: 1;
}

.section-image-row {
  align-items: center;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) 38px;
}

.section-image-row button,
.section-side-rail button {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  color: #475569;
  display: flex;
  height: 36px;
  justify-content: center;
  width: 36px;
}

.section-card-media {
  border-radius: 10px;
  height: 100%;
  min-height: 160px;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.post-section-card:not(.active) .section-card-media {
  min-height: 78px;
}

.post-section-card.active .section-card-media {
  min-height: 260px;
}

.section-card-media img,
.section-card-media video {
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.media-kind-badge {
  align-items: center;
  background: rgba(15, 23, 42, 0.72);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  font-size: 11px;
  height: 24px;
  justify-content: center;
  position: absolute;
  right: 6px;
  top: 6px;
  width: 24px;
}

.preview-column {
  background: #ffffff;
  border-radius: 18px;
  padding: 0;
}

.preview-head {
  justify-content: space-between;
}

.preview-device-switch {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: inline-flex;
  gap: 4px;
  padding: 4px;
}

.preview-device-switch button {
  align-items: center;
  border-radius: 9px;
  color: #64748b;
  display: flex;
  height: 30px;
  justify-content: center;
  width: 30px;
}

.preview-device-switch button.active {
  background: #ffffff;
  color: #9333ea;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.post-live-preview {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 12px;
  padding: 16px;
}

.post-live-preview.preview-tablet {
  justify-self: center;
  max-width: 620px;
}

.post-live-preview.preview-mobile {
  justify-self: center;
  max-width: 390px;
}

.preview-category {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  font-size: 10px;
  font-weight: 950;
  justify-self: start;
  padding: 5px 8px;
  text-transform: uppercase;
}

.post-live-preview h1 {
  color: #111827;
  font-size: 24px;
  font-weight: 950;
  line-height: 1.12;
}

.post-live-preview.analysis-tier-gold,
.post-live-preview.analysis-tier-legendary {
  background:
    radial-gradient(circle at 52% 0%, rgba(250, 204, 21, 0.12), transparent 34%),
    linear-gradient(180deg, #ffffff, #fff8e1);
  border-color: rgba(245, 158, 11, 0.42);
  box-shadow: 0 22px 68px rgba(120, 53, 15, 0.16);
}

.post-live-preview.analysis-tier-legendary {
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.45), transparent 22%),
    radial-gradient(circle at 84% 8%, rgba(250, 204, 21, 0.22), transparent 30%),
    linear-gradient(135deg, #111827, #3b2605 56%, #0f172a);
  border-color: rgba(250, 204, 21, 0.68);
  box-shadow: 0 24px 76px rgba(120, 53, 15, 0.34);
}

.post-live-preview.analysis-tier-legendary h1,
.post-live-preview.analysis-tier-legendary .preview-section h2 {
  color: #ffffff;
}

.post-live-preview.analysis-tier-legendary .preview-subtitle,
.post-live-preview.analysis-tier-legendary .preview-summary,
.post-live-preview.analysis-tier-legendary .preview-section p,
.post-live-preview.analysis-tier-legendary .preview-meta,
.post-live-preview.analysis-tier-legendary .rich-content {
  color: #fde68a;
}

.preview-subtitle,
.preview-summary,
.preview-section p {
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.5;
}

.rich-content {
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.62;
}

.rich-content :deep(p) {
  margin: 0 0 10px;
}

.rich-content :deep(strong) {
  color: #111827;
  font-weight: 950;
}

.rich-content :deep(em) {
  font-style: italic;
}

.rich-content :deep(u) {
  text-decoration: underline;
  text-decoration-color: #a855f7;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}

.rich-content :deep(ul),
.rich-content :deep(ol) {
  display: grid;
  gap: 6px;
  margin: 8px 0 12px 20px;
  padding: 0;
}

.rich-content :deep(ul) {
  list-style: disc;
}

.rich-content :deep(ol) {
  list-style: decimal;
}

.rich-content :deep(blockquote) {
  background: #faf5ff;
  border-left: 4px solid #a855f7;
  border-radius: 10px;
  color: #475569;
  margin: 10px 0;
  padding: 10px 12px;
}

.rich-content :deep(a) {
  color: #9333ea;
  font-weight: 900;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.rich-content :deep(hr) {
  border: 0;
  border-top: 1px solid #e9d5ff;
  margin: 14px 0;
}

.preview-meta {
  color: #64748b;
  display: flex;
  flex-wrap: wrap;
  font-size: 11px;
  font-weight: 850;
  gap: 12px;
}

.preview-cover,
.preview-section img,
.preview-section-media {
  border-radius: 12px;
  max-height: 270px;
  object-fit: cover;
  width: 100%;
}

.preview-media,
.preview-section-media {
  aspect-ratio: 16 / 9;
  background: #020617;
  overflow: hidden;
}

.preview-media img,
.preview-media iframe,
.preview-media video,
.preview-section-media img,
.preview-section-media iframe,
.preview-section-media video {
  border: 0;
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.preview-cover.placeholder {
  background: #f8fafc;
  color: #a78bfa;
  display: grid;
  min-height: 210px;
  place-items: center;
}

.preview-section {
  display: grid;
  gap: 8px;
}

.preview-section h2 {
  color: #111827;
  font-size: 16px;
  font-weight: 950;
}

.preview-score-card {
  background: #faf5ff;
  border: 1px solid #e9d5ff;
  border-radius: 16px;
  display: grid;
  gap: 8px;
  padding: 14px;
}

.preview-score-card > strong {
  color: #7c3aed;
  font-size: 34px;
  font-weight: 950;
}

.preview-score-card > span {
  color: #9333ea;
  font-weight: 950;
}

.preview-score-card div {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.preview-score-card small {
  color: #64748b;
  display: grid;
  font-size: 10px;
  font-weight: 850;
  gap: 4px;
}

.preview-score-card b {
  color: #111827;
}

.image-picker-modal,
.editor-loading-cover {
  display: grid;
  inset: 0;
  place-items: center;
  position: fixed;
  z-index: 2200;
}

.image-picker-backdrop {
  background: rgba(15, 23, 42, 0.62);
  inset: 0;
  position: absolute;
}

.image-picker-panel {
  background: #ffffff;
  border-radius: 22px;
  box-shadow: 0 30px 90px rgba(15, 23, 42, 0.4);
  display: grid;
  gap: 16px;
  max-height: min(860px, calc(100dvh - 36px));
  max-width: min(1180px, calc(100vw - 36px));
  overflow: hidden;
  padding: 18px;
  position: relative;
  width: min(1180px, calc(100vw - 36px));
}

.image-picker-panel header {
  align-items: start;
  display: flex;
  justify-content: space-between;
}

.image-picker-panel header span {
  color: #7c3aed;
  font-size: 11px;
  font-weight: 950;
}

.image-picker-panel header h2 {
  color: #111827;
  font-size: 20px;
  font-weight: 950;
}

.image-picker-panel header p {
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
}

.image-picker-panel header button {
  background: #f8fafc;
  border-radius: 999px;
  color: #64748b;
  height: 38px;
  width: 38px;
}

.igdb-search-row {
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.igdb-search-row input {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  min-height: 44px;
  padding: 0 14px;
}

.igdb-search-row button {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 12px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
  padding: 0 18px;
}

.target-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.target-strip button {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #334155;
  display: grid;
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 950;
  gap: 2px;
  min-width: 132px;
  padding: 9px 12px;
  text-align: left;
}

.target-strip button.active {
  border-color: #a855f7;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.12);
}

.target-strip small {
  color: #64748b;
  font-size: 10px;
}

.igdb-filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.igdb-filter-tabs button {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #475569;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
}

.igdb-filter-tabs button.active {
  background: #f5f3ff;
  border-color: #a855f7;
  color: #7c3aed;
}

.igdb-filter-tabs span {
  background: rgba(124, 58, 237, 0.12);
  border-radius: 999px;
  color: inherit;
  font-size: 10px;
  min-width: 22px;
  padding: 3px 6px;
  text-align: center;
}

.igdb-empty {
  background: #f8fafc;
  border-radius: 14px;
  color: #64748b;
  font-size: 13px;
  font-weight: 850;
  padding: 24px;
  text-align: center;
}

.igdb-gallery {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  overflow-y: auto;
  padding-right: 4px;
}

.igdb-gallery article {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  display: grid;
  gap: 8px;
  overflow: hidden;
  padding: 8px;
}

.igdb-gallery article.selected {
  border-color: #a855f7;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.12);
}

.igdb-gallery img {
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  object-fit: cover;
  width: 100%;
}

.igdb-gallery div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.igdb-gallery span,
.igdb-gallery strong {
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.igdb-gallery strong {
  color: #9333ea;
}

.igdb-gallery button {
  background: #f5f3ff;
  border-radius: 10px;
  color: #7c3aed;
  font-size: 11px;
  font-weight: 950;
  min-height: 34px;
}

.app-toast {
  align-items: center;
  background: #111827;
  border-radius: 999px;
  bottom: 32px;
  box-shadow: 0 25px 50px rgba(15, 23, 42, 0.25);
  color: #ffffff;
  display: flex;
  gap: 12px;
  left: 50%;
  padding: 12px 18px;
  position: fixed;
  transform: translateX(-50%);
  z-index: 2400;
}

.app-toast-icon {
  align-items: center;
  background: #22c55e;
  border-radius: 999px;
  display: flex;
  height: 24px;
  justify-content: center;
  width: 24px;
}

.app-toast-icon.delete {
  background: #ef4444;
}

.editor-loading-cover {
  background: rgba(255, 255, 255, 0.72);
}

@media (max-width: 1240px) {
  .editor-layout,
  .preview-collapsed .editor-layout {
    grid-template-columns: minmax(280px, 0.9fr) minmax(420px, 1.1fr);
  }

  .preview-column {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .post-editor-modal {
    align-items: stretch;
    padding: 0;
  }

  .post-editor-panel {
    --post-editor-mobile-actionbar-height: 64px;
    --post-editor-mobile-actionbar-bottom: max(12px, env(safe-area-inset-bottom));
    --post-editor-mobile-actionbar-space: calc(var(--post-editor-mobile-actionbar-height) + var(--post-editor-mobile-actionbar-bottom) + 72px);
    border-radius: 0;
    height: 100dvh;
    max-height: 100dvh;
    max-width: 100vw;
    width: 100vw;
  }

  .editor-topbar {
    grid-template-columns: auto minmax(0, 1fr) auto;
    padding: 12px;
  }

  .editor-title-block h2 {
    font-size: 15px;
  }

  .editor-title-block p {
    font-size: 10px;
  }

  .back-btn {
    font-size: 0;
    height: 38px;
    padding: 0;
    width: 38px;
  }

  .back-btn i {
    font-size: 13px;
  }

  .editor-actions-top .utility-btn,
  .editor-actions-top .draft-btn,
  .publish-top-btn {
    display: none;
  }

  .mobile-stepper {
    background: #ffffff;
    border-bottom: 1px solid #eef2f7;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    padding: 10px 14px;
  }

  .mobile-stepper button {
    align-items: center;
    color: #64748b;
    display: grid;
    font-size: 10px;
    font-weight: 850;
    gap: 4px;
    justify-items: center;
  }

  .mobile-stepper span {
    align-items: center;
    background: #e2e8f0;
    border-radius: 999px;
    display: flex;
    height: 24px;
    justify-content: center;
    width: 24px;
  }

  .mobile-stepper button.active {
    color: #9333ea;
  }

  .mobile-stepper button.active span {
    background: #9333ea;
    color: #ffffff;
  }

  .editor-layout,
  .preview-collapsed .editor-layout {
    grid-template-columns: 1fr;
    overflow-y: auto;
    padding: 16px 16px var(--post-editor-mobile-actionbar-space);
    scroll-padding-bottom: var(--post-editor-mobile-actionbar-space);
  }

  .editor-layout::after {
    content: "";
    display: block;
    grid-column: 1 / -1;
    min-height: var(--post-editor-mobile-actionbar-space);
    pointer-events: none;
  }

  .editor-column {
    overflow: visible;
    padding-bottom: 0;
    padding-right: 0;
  }

  .mobile-hidden {
    display: none;
  }

  .cover-actions,
  .analysis-criteria-grid,
  .analysis-pros-cons {
    grid-template-columns: 1fr;
  }

  .analysis-editor {
    padding: 14px;
  }

  .score-editor-row {
    align-items: center;
  }

  .post-section-card,
  .post-section-card.has-media {
    align-items: stretch;
    gap: 10px;
    grid-template-columns: 44px minmax(0, 1fr);
    height: auto;
    min-height: 0;
    padding: 12px;
  }

  .post-section-card.active,
  .post-section-card.active.has-media {
    grid-template-columns: 44px minmax(0, 1fr);
    min-height: 0;
    padding: 12px;
  }

  .post-section-card:not(.active),
  .post-section-card:not(.active).has-media {
    grid-template-columns: 36px minmax(0, 1fr);
    padding: 10px;
  }

  .section-card-media {
    grid-column: 2;
    height: 150px;
    min-height: 150px;
  }

  .post-section-card .section-card-media,
  .post-section-card:not(.active) .section-card-media {
    display: none;
  }

  .section-copy {
    min-width: 0;
    width: 100%;
  }

  .section-copy input,
  .section-copy textarea,
  .section-image-row {
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
  }

  .section-copy textarea {
    min-height: 118px;
  }

  .section-image-row {
    grid-template-columns: minmax(0, 1fr) 42px;
  }

  .section-side-rail {
    gap: 5px;
  }

  .section-side-rail button {
    height: 32px;
    opacity: 1;
    pointer-events: auto;
    transform: none;
    width: 32px;
  }

  .image-picker-panel {
    border-radius: 0;
    max-height: 100dvh;
    max-width: 100vw;
    width: 100vw;
  }

  .igdb-search-row {
    grid-template-columns: 1fr;
  }

  .mobile-editor-actionbar {
    align-items: center;
    backdrop-filter: blur(18px);
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(226, 232, 240, 0.86);
    border-radius: 24px;
    bottom: var(--post-editor-mobile-actionbar-bottom);
    box-shadow: 0 18px 46px rgba(15, 23, 42, 0.18);
    display: grid;
    gap: 10px;
    grid-template-columns: 46px 46px minmax(128px, 1fr);
    left: 12px;
    padding: 8px;
    position: fixed;
    right: 12px;
    min-height: var(--post-editor-mobile-actionbar-height);
    z-index: 70;
  }

  .mobile-editor-actionbar button {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    color: #475569;
    display: inline-flex;
    font-size: 15px;
    font-weight: 950;
    gap: 8px;
    height: 46px;
    justify-content: center;
    min-width: 0;
  }

  .mobile-editor-actionbar button:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }

  .mobile-editor-actionbar .publish {
    background: linear-gradient(135deg, #9333ea, #ec4899);
    border-color: transparent;
    color: #ffffff;
    font-size: 13px;
    padding: 0 14px;
  }
}

.analysis-tier-gold .preview-score-card {
  background: rgba(17, 17, 17, 0.88);
  border-color: rgba(250, 204, 21, 0.42);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.22), 0 0 26px rgba(245, 158, 11, 0.14);
}

.analysis-tier-gold .preview-score-card > strong,
.analysis-tier-gold .preview-score-card > span,
.analysis-tier-gold .preview-score-card b {
  color: #facc15;
}

.analysis-tier-gold .preview-score-card small {
  color: #fde68a;
}

.analysis-tier-legendary .preview-score-card {
  background:
    radial-gradient(circle at 50% 0%, rgba(250, 204, 21, 0.22), transparent 32%),
    rgba(5, 8, 22, 0.9);
  border-color: rgba(250, 204, 21, 0.68);
  box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.24), 0 22px 54px rgba(0, 0, 0, 0.32);
}

.analysis-tier-legendary .preview-score-card > strong,
.analysis-tier-legendary .preview-score-card > span,
.analysis-tier-legendary .preview-score-card b {
  color: #facc15;
}

.analysis-tier-legendary .preview-score-card small {
  color: #fef3c7;
}

</style>
