<template>
    <div class="post-editor-page">
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
          <button v-if="!isHeroMode" type="button" class="utility-btn" @click="copySocialJsonInstructions" title="Copiar instrucciones para generar el articulo completo y el carrusel con destacados">
            <i class="far fa-copy"></i>
            Instrucciones JSON
          </button>
          <button v-if="!isHeroMode" type="button" class="utility-btn" @click="pasteJsonIntoPost">
            <i class="fas fa-code"></i>
            Pegar JSON
          </button>
          <button v-if="!isHeroMode" type="button" class="utility-btn" @click="openImagePicker('cover')">
            <i class="far fa-images"></i>
            Imagenes IGDB
          </button>
          <button v-if="!isHeroMode" type="button" class="utility-btn" @click="togglePreview">
            <i :class="previewCollapsed ? 'far fa-eye' : 'far fa-eye-slash'"></i>
            {{ previewCollapsed ? 'Mostrar vista previa' : 'Ocultar vista previa' }}
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
        <button type="button" :class="{ active: mobileStep === 'preview' }" :disabled="!isInitialFlowComplete" @click="showPreview">
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
              <section class="editor-info-group"><h3 class="info-group-title">Contenido</h3>
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

              </section>
              <section class="editor-info-group cover-tool">
                <div class="field-row">
                  <h3 class="info-group-title">Portada</h3>
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

                </div>
                <div class="cover-actions">
                  <button v-if="!isHeroMode" type="button" @click="openImagePicker('cover')">
                    <i class="far fa-images"></i>
                    Elegir imagen
                  </button>
                  <div class="cover-url-control">
                    <ClipboardUrlField v-model="post.image" label="Portada del post" />
                  </div>
                </div>
              <p class="info-group-help">Elige una imagen de la biblioteca o pega el enlace de tu portada.</p>
              </section>
              <section v-if="!isHeroMode" class="editor-info-group"><h3 class="info-group-title">Apariencia</h3><p class="info-group-help">Colores y estilo de la noticia.</p><VisualThemeSelector v-model="post.visualThemeId" /></section>
              <section v-if="!isHeroMode" class="editor-info-group"><h3 class="info-group-title">En la portada de la web</h3>
              <label v-if="!isHeroMode" class="home-pin-option"><input type="checkbox" :checked="post.homePinned !== false" @change="post.homePinned = $event.target.checked; post.homePinnedAt = Date.now()" /> Destacar en el carrusel de Inicio <small>Hasta seis publicaciones. Puedes quitar el pin desde el gestor.</small></label>
              <details class="hero-media-settings"><summary>Personalizar imagen y galería de Inicio</summary><p>Opcional. Usa una imagen horizontal y un logo transparente. Si no añades imagen, se usará la portada del post.</p><div class="field-group"><span>Imagen del hero (URL)</span><ClipboardUrlField v-model="post.hero.image" label="Imagen del hero" /></div><div class="field-group"><span>Logo del juego (URL)</span><ClipboardUrlField v-model="post.hero.logoUrl" label="Logo del juego" /></div><label class="field-group"><span>Encuadre de la imagen (Inicio y noticia)</span><select v-model="post.hero.position"><option value="center top">Arriba</option><option value="center center">Centro</option><option value="center bottom">Abajo</option><option value="left top">Izquierda, arriba</option><option value="right top">Derecha, arriba</option></select></label><div class="field-group"><span>Galería: una URL por línea</span><ClipboardUrlField :model-value="post.hero.images.map(item=>item.url).join('\n')" label="Galería del hero" multiple @update:model-value="value => post.hero.images = value.split('\n').filter(Boolean).map(url => post.hero.images.find(item=>item.url===url) || {url,alt:'',position:'center top'})" /></div></details>
              </section>

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
                    <span>Valoración por estrellas</span>
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
                  <CriterionStarPicker v-for="item in post.analysis.criteria" :key="item.key" v-model="item.score" :label="item.label" />
                </div>

                <p class="analysis-save-hint">Toca de 1 a 10 estrellas por criterio. La nota final es la media convertida a 100. La vista previa cambia al editar; los cambios no se guardan automáticamente.</p>
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
                <div class="analysis-save-row"><span>Guarda la nota junto con los demás cambios de la publicación.</span><button type="button" :disabled="loading" @click="savePost('draft')">{{ loading ? 'Guardando…' : (editData ? 'Guardar cambios' : 'Guardar borrador') }}</button></div>
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
                <span>Ruta personalizada (slug)</span>
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
                <div class="field-group">
                  <span>Canonical URL</span>
                  <ClipboardUrlField v-model="post.canonicalUrl" label="URL canonical" />
                </div>
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
            <button type="button" class="accordion-trigger" :disabled="!isInitialFlowComplete" @click="toggleAccordion('game')">
              <span class="accordion-icon"><i class="fas fa-gamepad"></i></span>
              <span>
                <strong>5. Ficha del juego</strong>
                <small>{{ isInitialFlowComplete ? 'Nombre, plataformas, lanzamiento y enlaces oficiales.' : initialFlowMessage }}</small>
              </span>
              <i :class="isAccordionOpen('game') ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
            </button>
            <div v-show="isAccordionOpen('game')" class="accordion-body">
              <div class="field-grid-2">
                <label class="field-group">
                  <span>Nombre en espanol</span>
                  <input v-model="post.game.nameEs" placeholder="Leyendas Pokemon: Z-A" />
                </label>
                <label class="field-group">
                  <span>Nombre en ingles / IGDB</span>
                  <input v-model="post.game.nameEn" placeholder="Pokemon Legends: Z-A" />
                </label>
              </div>
              <div class="game-platform-date-grid">
                <div class="field-group">
                  <span>Plataformas</span>
                  <div class="game-platform-editor">
                    <div v-if="post.game.platforms.length" class="game-platform-list">
                      <div
                        v-for="platform in post.game.platforms"
                        :key="platform.name"
                        class="game-platform-item"
                        :class="{ pending: !platform.confirmed }"
                      >
                        <button type="button" @click="platform.confirmed = !platform.confirmed">
                          <i :class="platform.confirmed ? 'fas fa-circle-check' : 'far fa-clock'"></i>
                          {{ platform.name }}
                          <small>{{ platform.confirmed ? 'Confirmada' : 'Pendiente' }}</small>
                        </button>
                        <button type="button" class="remove-platform" :aria-label="`Quitar ${platform.name}`" @click="removeGamePlatform(platform.name)">
                          <i class="fas fa-xmark"></i>
                        </button>
                      </div>
                    </div>
                    <div class="category-combobox">
                      <select v-model="gamePlatformToAdd" @change="addGamePlatform">
                        <option value="">Agregar plataforma</option>
                        <option v-for="platform in availableGamePlatforms" :key="platform" :value="platform">{{ platform }}</option>
                      </select>
                      <i class="fas fa-chevron-down"></i>
                    </div>
                    <p>Al pulsar una plataforma alternas entre confirmada y pendiente.</p>
                  </div>
                </div>
                <label class="field-group">
                  <span>Fecha de lanzamiento</span>
                  <input v-model="post.game.releaseDate" type="date" />
                </label>
              </div>
              <div class="field-grid-2">
                <label class="field-group"><span>Desarrolladora</span><input v-model="post.game.developer" placeholder="Nombre del estudio" /></label>
                <label class="field-group"><span>Géneros</span><input :value="(post.game.genres || []).join(', ')" @change="post.game.genres=$event.target.value.split(',').map(value=>value.trim()).filter(Boolean)" placeholder="RPG, Simulación" /></label>
              </div>
              <div class="field-group"><span>Carátula del juego</span><ClipboardUrlField v-model="post.game.cover" label="Carátula del juego" /></div>
              <label class="field-group">
                <span>Nota del lanzamiento</span>
                <input v-model="post.game.releaseNote" placeholder="Nintendo Switch 2 pendiente de anuncio oficial" />
              </label>
              <div class="field-group">
                <span>Web oficial</span>
                <ClipboardUrlField v-model="post.game.officialUrl" label="Web oficial" />
              </div>
            </div>
          </article>

          <article v-if="!isHeroMode" class="editor-accordion" :class="{ gated: !isInitialFlowComplete }">
            <button type="button" class="accordion-trigger" :disabled="!isInitialFlowComplete" @click="toggleAccordion('extras')">
              <span class="accordion-icon"><i class="fas fa-wand-magic-sparkles"></i></span>
              <span>
                <strong>6. Extras y gamificacion</strong>
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
                  <input v-model="section.title" class="section-title-input" aria-label="Título de la sección" placeholder="Subtitulo de la seccion" />
                  <input v-model="section.navLabel" maxlength="42" aria-label="Nombre corto en la navegación" placeholder="Nombre corto para navegar: Historia, Jugabilidad…" />
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

                </template>

                <template v-else>
                  <strong :title="section.title">{{ sectionExcerpt(section.title, 72) || 'Sin subtitulo todavia' }}</strong>
                  <p>{{ sectionExcerpt(section.content, 110) || 'Sin contenido todavia' }}</p>
                </template>
                <div v-if="section.image || activeSectionIndex === index" class="section-media-tools">
                  <div class="section-image-row">
                    <ClipboardUrlField v-if="activeSectionIndex === index" v-model="section.image" :label="`Imagen de la sección ${index+1}`" />
                    <button type="button" class="section-media-picker" :aria-label="`Elegir imagen de la sección ${index+1}`" title="Elegir o cambiar imagen" @click.stop="openImagePicker(`section-${index}`)">
                      <span v-if="section.image" class="section-card-media" :data-state="sectionMediaState[section.image] || 'loading'">
                        <img @load="sectionMediaState[section.image]='loaded'" @error="sectionMediaState[section.image]='error'"
                          v-if="mediaFor(section.image).type === 'youtube'"
                          :src="mediaFor(section.image).thumbUrl"
                          :alt="section.title || `Seccion ${index + 1}`"
                        />
                        <video @loadedmetadata="sectionMediaState[section.image]='loaded'" @error="sectionMediaState[section.image]='error'" preload="metadata" v-else-if="mediaFor(section.image).type === 'video'" :src="mediaFor(section.image).url" muted playsinline></video>
                        <img @load="sectionMediaState[section.image]='loaded'" @error="sectionMediaState[section.image]='error'" v-else :src="mediaFor(section.image).url" :alt="section.title || `Seccion ${index + 1}`" />
                        <small class="section-media-status">{{ sectionMediaState[section.image] === 'error' ? 'No carga' : sectionMediaState[section.image] === 'loaded' ? 'Disponible' : 'Comprobando' }}</small>
                        <span v-if="isVideoMedia(mediaFor(section.image))" class="media-kind-badge">
                          <i class="fas fa-play"></i>
                        </span>
                      </span>
                      <i v-if="!section.image" class="far fa-image" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
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
            <button type="button" class="utility-btn" @click="hidePreview">
              <i class="far fa-eye-slash"></i>
              Esconder
            </button>
          </div>

          <article
            class="post-live-preview"
            :style="previewThemeStyle"
            :class="[
              { analysis: isAnalysisPost },
              isAnalysisPost ? `analysis-tier-${analysisTier.key}` : '',
              `preview-${previewDevice}`
            ]"
          >
            <PostCinematicHero
              :editorial="true"
              :show-actions="false"
              :post="{ ...post, authorName: 'Galaxia Nintendera' }"
              :is-analysis="isAnalysisPost"
              :analysis-score="analysisScore"
              :analysis-tier="analysisTier"
              :date-label="'Hoy'"
              :preview="true"
              :device="previewDevice"
            />

            <div class="editorial-preview-layout">
            <main class="editorial-preview-article">
             <nav class="preview-reader-tabs" aria-label="Apartados de la vista previa"><button type="button" :aria-pressed="previewSection === -1" @click="previewSection=-1">{{isAnalysisPost?'Análisis':'Noticia'}}</button><button v-for="(section,index) in visibleSections" :key="index" type="button" :aria-pressed="previewSection === index" @click="previewSection=index">{{sectionNavLabel(section,index)}}</button></nav>
             <div v-if="previewSection === -1" class="preview-introduction reading-prose" v-html="richText(post.content)"></div>
            <section v-for="(section, index) in previewSections" :key="index" class="preview-section">
              <h2>{{ section.title || `Seccion ${index + 1}` }}</h2>
              <div v-if="section.image" class="preview-section-media" :class="{ video: isVideoMedia(mediaFor(section.image)) }">
                <iframe
                  v-if="mediaFor(section.image).type === 'youtube'"
                  :src="mediaFor(section.image).embedUrl"
                  :title="section.title || `Seccion ${index + 1}`"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowfullscreen
                ></iframe>
                <video v-else-if="mediaFor(section.image).type === 'video'" :src="mediaFor(section.image).url" controls playsinline></video>
                <img v-else :src="mediaFor(section.image).url" :alt="section.title || `Seccion ${index + 1}`" loading="lazy" decoding="async" />
              </div>
              <p v-if="sectionSubtitle(section)" class="preview-section-subtitle">{{ sectionSubtitle(section) }}</p>
              <div class="preview-section-copy rich-content reading-prose" v-html="richText(section.content || 'El contenido de esta seccion se vera aqui cuando lo escribas.')"></div>
            </section>

            </main>
            <aside class="editorial-preview-sidebar"><ReaderActions read-badge-text="Visto" :preview="true" /><AnalysisRatingCard v-if="isAnalysisPost" :analysis="post.analysis" :tier="analysisTier" /><GameInfoCard :game="post.game" /></aside>
            </div>

          </article>
        </aside>
      </main>

      <AppNotice :visible="toast.show" :message="toast.message" :type="toast.type" />

      <Transition name="fade">
        <div v-if="loading" class="editor-loading-cover">
          <GalaxyLoader :title="savingLoaderTitle" :text="savingLoaderText" />
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
          <section class="image-picker-panel" role="dialog" aria-modal="true" aria-labelledby="image-picker-title">
            <header>
              <div>
                <span>BUSCADOR DE JUEGOS</span>
                <h2 id="image-picker-title">Elegir imágenes del juego</h2>
                <p>Escribe parte del nombre y el buscador mostrara juegos relacionados, portadas, capturas y artes.</p>
              </div>
              <button type="button" aria-label="Cerrar explorador de imágenes" @click="imagePickerOpen = false"><i class="fas fa-xmark"></i></button>
            </header>

            <form class="igdb-search-row" @submit.prevent="searchIgdbImages">
              <input v-model="igdbQuery" placeholder="Ej: pokemon za, petit planet..." autocomplete="off" />
              <button type="submit" :disabled="igdbLoading || igdbQuery.trim().length < 2">
                <i :class="igdbLoading ? 'fas fa-circle-notch fa-spin' : 'fas fa-search'"></i>
                Buscar
              </button>
            </form>
            <p class="igdb-search-hint">
              <i class="fas fa-bolt"></i>
              Busca automaticamente cuando dejas de escribir. No hace falta poner el titulo exacto.
            </p>

            <div v-if="igdbGames.length" class="igdb-game-matches" aria-label="Juegos encontrados">
              <button type="button" :class="{ active: igdbGameFilter === 'all' }" @click="igdbGameFilter = 'all'">
                Todos
                <span>{{ igdbImages.length }}</span>
              </button>
              <button
                v-for="game in igdbGames"
                :key="game.id"
                type="button"
                :class="{ active: String(igdbGameFilter) === String(game.id) }"
                @click="igdbGameFilter = game.id"
              >
                {{ game.name }}
                <span>{{ game.imageCount }}</span>
              </button>
            </div>

            <div v-if="igdbError" class="json-paste-error">{{ igdbError }}</div>
            <div v-if="!igdbImages.length && !igdbLoading" class="igdb-empty">
              {{ igdbHasSearched ? 'No encontramos imagenes. Prueba con menos palabras.' : 'Escribe al menos dos letras para comenzar.' }}
            </div>
            <ContentLoading v-if="igdbLoading" variant="inline" />

            <div v-if="igdbImages.length && !igdbLoading" class="igdb-picker-workspace">
              <aside class="igdb-targets" aria-label="Ubicacion de la imagen">
                <div class="igdb-pane-title">
                  <span>Destino</span>
                  <small>{{ imageTargets.filter(target => target.url).length }}/{{ imageTargets.length }}</small>
                </div>
                <button
                  v-for="(target, index) in imageTargets"
                  :key="target.id"
                  type="button"
                  :class="{ active: imageTargetId === target.id, filled: target.url }"
                  @click="selectImageTarget(target)"
                >
                  <img v-if="target.url" :src="target.url" alt="" />
                  <b v-else>{{ index + 1 }}</b>
                  <span>
                    <strong>{{ target.label }}</strong>
                    <small>{{ target.url ? 'Imagen asignada' : 'Sin imagen' }}</small>
                  </span>
                  <i :class="target.url ? 'fas fa-check' : 'fas fa-chevron-right'"></i>
                </button>
              </aside>

              <section class="igdb-results-pane">
                <div class="igdb-pane-title">
                  <span>{{ filteredIgdbImages.length }} imagenes</span>
                  <small>Selecciona una para verla</small>
                </div>
                <div class="igdb-filter-tabs">
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

                <div v-if="filteredIgdbImages.length" class="igdb-gallery">
                  <button
                    v-for="image in filteredIgdbImages"
                    :key="image.id"
                    type="button"
                    :class="{ active: activeIgdbImage?.id === image.id, assigned: assignedLabel(image.url) }"
                    @click="selectedIgdbImage = image"
                  >
                    <img :src="image.url" :alt="`${image.gameName || 'Juego'} - ${image.typeLabel}`" loading="lazy" decoding="async" />
                    <span><i class="far fa-image"></i>{{ image.typeLabel }}</span>
                    <em v-if="assignedLabel(image.url)" :title="`Asignada a ${assignedLabel(image.url)}`"><i class="fas fa-check"></i></em>
                  </button>
                </div>
                <div v-else class="igdb-empty">No hay imagenes en esta categoria.</div>
              </section>

              <aside class="igdb-selection-pane">
                <div class="igdb-pane-title"><span>Vista previa</span></div>
                <template v-if="activeIgdbImage">
                  <img :src="activeIgdbImage.url" :alt="activeIgdbImage.typeLabel" />
                  <div class="igdb-selection-copy">
                    <strong>{{ activeIgdbImage.gameName || 'Imagen del juego' }}</strong>
                    <span>{{ activeIgdbImage.typeLabel }}</span>
                  </div>
                  <button type="button" class="igdb-use-image" @click="assignIgdbImage(activeIgdbImage)">
                    <i class="fas fa-check"></i>
                    Usar en {{ activeImageTarget?.label || 'el articulo' }}
                  </button>
                  <a :href="activeIgdbImage.url" target="_blank" rel="noopener noreferrer">
                    Ver tamaño completo <i class="fas fa-arrow-up-right-from-square"></i>
                  </a>
                  <p><i class="far fa-lightbulb"></i> Las imágenes horizontales funcionan mejor en portadas y secciones.</p>
                </template>
              </aside>
            </div>
          </section>
        </div>
      </Transition>
    </div>
    </div>
</template>

<script setup>
import ContentLoading from "@/components/shared/ContentLoading.vue"
import ClipboardUrlField from '@/components/posts/ClipboardUrlField.vue'
import VisualThemeSelector from '@/components/posts/VisualThemeSelector.vue'
import { clearPublicPageCache } from '@/services/publicPageCache'
import { normalizeSocialContent } from '@/services/socialContent'
import { normalizeHomeHero } from '@/services/homeHero'
import { gameEditorialFields } from '@/services/articlePresentation'
import { useVisualThemes } from '@/composables/useVisualThemes'
import { postWebThemeCss, validateVisualTheme } from '@/services/visualThemes'
import ReaderActions from './ReaderActions.vue'
import { sectionNavLabel } from '@/services/articlePresentation'
import CriterionStarPicker from './CriterionStarPicker.vue'
import { analysisRating, criterionRating } from '@/services/articlePresentation'
import AnalysisRatingCard from '@/components/posts/AnalysisRatingCard.vue'
import GameInfoCard from '@/components/posts/GameInfoCard.vue'
import { homePinOverflow } from '@/services/homePins'
import socialJsonInstructions from '../../../docs/prompt-post-completo-redes.md?raw'
import socialJsonExample from '../../../examples/post-completo-social-v2.example.json?raw'
import AppNotice from '@/components/shared/AppNotice.vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { addDoc, collection, deleteField, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { isVideoMedia, mediaFromUrl } from '@/services/mediaLinks'
import { loadPostCategories } from '@/services/postCategories'
import { READ_REWARD_STARS } from '@/services/profileProgress'
import { renderRichText } from '@/services/richText'
import { playPublishSound } from '@/services/uiSounds'

import GalaxyLoader from '@/components/shared/GalaxyLoader.vue'
import PostCinematicHero from '@/components/posts/PostCinematicHero.vue'

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
const savingTargetStatus = ref('pending')
const savingLoaderTitle = computed(() => {
  if (props.editData) return 'Guardando cambios'
  if (savingTargetStatus.value === 'draft') return 'Guardando borrador'
  return isHeroMode.value ? 'Publicando principal' : 'Publicando post'
})
const savingLoaderText = computed(() => {
  if (props.editData) return 'Actualizando la publicacion en Galaxia Nintendera...'
  if (savingTargetStatus.value === 'draft') return 'Conservando todo para que puedas continuar despues...'
  return 'Preparando imagenes, contenido y detalles de la publicacion...'
})
const toast = ref({ show: false, message: '', type: 'success' })
const activeSectionIndex = ref(0)
const mobileStep = ref('info')
const previewCollapsed = ref(true)
function sectionExcerpt(value, limit) {
  const text = String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > limit ? text.slice(0, limit).trimEnd() + '…' : text
}
function showPreview() { previewCollapsed.value = false; mobileStep.value = 'preview' }
function hidePreview() { previewCollapsed.value = true; if (mobileStep.value === 'preview') mobileStep.value = 'sections' }
function togglePreview() { previewCollapsed.value ? showPreview() : hidePreview() }
const jsonPasteError = ref('')
const imagePickerOpen = ref(false)
const imageTargetId = ref('cover')
const igdbQuery = ref('')
const igdbImages = ref([])
const igdbGames = ref([])
const igdbGameFilter = ref('all')
const igdbTypeFilter = ref('all')
const selectedIgdbImage = ref(null)
const igdbLoading = ref(false)
const igdbError = ref('')
const igdbHasSearched = ref(false)
let igdbSearchTimer = null
let igdbSearchSequence = 0
const releaseAtInput = ref('')
const openAccordions = ref(['main'])
const previewDevice = ref('desktop')
const previewSection = ref(-1)
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

const sectionMediaState = ref({})
const post = ref({
  title: '',
  homePinned: props.editData ? props.editData.homePinned : true,
  homePinnedAt: 0,
  subtitle: '',
  content: '',
  category: '',
  image: '',
  publicationType: 'noticia',
  tagsText: '',
  hero: normalizeHomeHero(),
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
  game: {
    cover: '', developer: '', genres: [],
    nameEs: '',
    nameEn: '',
    platforms: [],
    releaseDate: '',
    releaseNote: '',
    officialUrl: ''
  },
  sections: [{ title: '', label: 'Introduccion', image: '', content: '', hidden: false }],
  social: {
    title: '',
    subtitle: '',
    summary: '',
    image: '',
    slides: []
  },
  analysis: {
    score: 88,
    hypeTitle: '',
    criteria: JSON.parse(JSON.stringify(defaultAnalysisCriteria)),
    prosText: '',
    consText: ''
  }
})
const selectedCategories = ref([])
const gamePlatformToAdd = ref('')
const gamePlatformOptions = ['PC', 'Nintendo Switch', 'Nintendo Switch 2', 'PlayStation 4', 'PlayStation 5', 'Xbox One', 'Xbox Series X|S', 'iOS', 'Android', 'macOS']
const availableGamePlatforms = computed(() => {
  const selected = new Set((post.value.game?.platforms || []).map(platform => platform.name))
  return gamePlatformOptions.filter(platform => !selected.has(platform))
})

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
const previewSections = computed(() => previewSection.value < 0 ? visibleSections.value : visibleSections.value.filter((_,index)=>index === previewSection.value))
const postCoverMedia = computed(() => mediaFromUrl(post.value.image))
const mediaFor = (url) => mediaFromUrl(url)
const sectionSubtitle = (section = {}) => String(section.subtitle || '').trim()
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
const {theme:previewTheme,enabled:previewThemeEnabled}=useVisualThemes(()=>post.value,{preferLocal:true})
const previewThemeStyle=computed(()=>previewThemeEnabled.value.web?postWebThemeCss(post.value,previewTheme.value):{})
const analysisScore = computed(() => analysisRating(post.value.analysis))
const previewStars = computed(() => {
  return Math.max(0, Math.min(5, Math.round(analysisScore.value / 20)))
})
const scoreLabel = computed(() => {
  return analysisTier.value.label
})
const analysisTier = computed(() => {
  const score = analysisScore.value
  if (score >= 95) {
    return {
      key: 'legendary',
      label: 'LEGENDARY',
      range: '95+'
    }
  }

  if (score >= 85) {
    return {
      key: 'gold',
      label: 'GOLD',
      range: '85+'
    }
  }

  if (score >= 75) {
    return {
      key: 'purple',
      label: 'PREMIUM',
      range: '75+'
    }
  }

  if (score >= 65) {
    return {
      key: 'blue',
      label: 'COOL',
      range: '65+'
    }
  }

  return {
    key: 'dark',
    label: 'REVIEW',
    range: '<65'
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
  return igdbImages.value.filter(image => {
    const matchesGame = igdbGameFilter.value === 'all'
      || String(image.gameId) === String(igdbGameFilter.value)
    const matchesType = igdbTypeFilter.value === 'all' || image.type === igdbTypeFilter.value
    return matchesGame && matchesType
  })
})
const activeIgdbImage = computed(() => {
  const selected = selectedIgdbImage.value
  if (selected && filteredIgdbImages.value.some(image => image.id === selected.id)) return selected
  return filteredIgdbImages.value[0] || null
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
    post.value.hero = normalizeHomeHero(post.value.hero)
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
    const savedGame = post.value.game || {}
    post.value.game = {
      ...gameEditorialFields(savedGame),
      nameEs: savedGame.nameEs || savedGame.nameSpanish || '',
      nameEn: savedGame.nameEn || savedGame.nameEnglish || post.value.mediaGameName || '',
      platforms: normalizeGamePlatforms(savedGame.platforms || savedGame.platformsText || ''),
      releaseDate: savedGame.releaseDate || '',
      releaseNote: savedGame.releaseNote || '',
      officialUrl: savedGame.officialUrl
        || savedGame.officialLinks?.find(link => /web oficial/i.test(link?.label || ''))?.url
        || savedGame.officialLinks?.[0]?.url
        || ''
    }
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

watch(igdbQuery, (query) => {
  clearTimeout(igdbSearchTimer)
  if (!imagePickerOpen.value || query.trim().length < 2) return
  igdbSearchTimer = window.setTimeout(() => searchIgdbImages(), 550)
})

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()

function normalizeGamePlatforms(value = []) {
  const source = Array.isArray(value) ? value : String(value || '').split(',')
  return source.map(item => {
    if (typeof item === 'object' && item) {
      return {
        name: String(item.name || item.label || '').trim(),
        confirmed: item.confirmed !== false && item.status !== 'unconfirmed'
      }
    }
    const name = String(item || '').trim()
    return { name: name.replace(/\?$/, '').trim(), confirmed: !name.endsWith('?') }
  }).filter(item => item.name)
}

const addGamePlatform = () => {
  const name = gamePlatformToAdd.value
  if (!name || post.value.game.platforms.some(platform => platform.name === name)) return
  post.value.game.platforms.push({ name, confirmed: true })
  gamePlatformToAdd.value = ''
}

const removeGamePlatform = (name) => {
  post.value.game.platforms = post.value.game.platforms.filter(platform => platform.name !== name)
}

const normalizeGameData = (game = {}) => {
  const names = game.names || game.nombres || {}
  const platformsSource = Array.isArray(game.platforms)
    ? game.platforms
    : (Array.isArray(game.plataformas) ? game.plataformas : String(game.platformsText || game.plataformas || '').split(','))
  const linksSource = Array.isArray(game.officialLinks)
    ? game.officialLinks
    : (Array.isArray(game.enlacesOficiales) ? game.enlacesOficiales : [])
  const normalizedLinks = linksSource.map((link, index) => {
    if (typeof link === 'string') return { label: index ? `Web oficial ${index + 1}` : 'Web oficial', url: link.trim() }
    return {
      label: String(link?.label || link?.nombre || link?.title || 'Web oficial').trim(),
      url: String(link?.url || link?.link || '').trim()
    }
  }).filter(link => link.url)
  const officialUrl = String(game.officialUrl || game.webOficial || normalizedLinks[0]?.url || '').trim()

  return {
    nameEs: String(game.nameEs || game.nameSpanish || game.nombreEs || names.es || names.spanish || '').trim(),
    ...gameEditorialFields(game),
    nameEn: String(game.nameEn || game.nameEnglish || game.nombreEn || names.en || names.english || '').trim(),
    platforms: normalizeGamePlatforms(platformsSource),
    releaseDate: String(game.releaseDate || game.fechaLanzamiento || '').trim(),
    releaseNote: String(game.releaseNote || game.notaLanzamiento || '').trim(),
    officialUrl
  }
}

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
    navLabel: String(section?.navLabel || '').trim().slice(0, 42),
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
  if (data.visualThemeId != null && (typeof data.visualThemeId !== 'string' || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(data.visualThemeId))) throw new Error('visualThemeId debe ser un identificador válido de tema.')
  if (!summary) throw new Error('El JSON no tiene summary/resumen.')
  if (!category && !categories.length) throw new Error('El JSON no tiene category/categoria o categories.')

  const sectionsSource = Array.isArray(data?.sections)
    ? data.sections
    : (Array.isArray(data?.secciones) ? data.secciones : [])
  const mergedCategories = [...new Set([category, ...categories].filter(Boolean))]
  const socialSource = data?.social || data?.shortVersion || data?.versionCorta || data?.version_corta || {}
  const social = normalizeSocialContent(socialSource)

  if (!social.title || !social.summary) {
    throw new Error('El JSON debe incluir social.title y social.summary con la version corta para imagenes.')
  }
  if (!social.slides.length) {
    throw new Error('El JSON debe incluir al menos una entrada en social.slides.')
  }
  const incompleteSocialSlide = social.slides.findIndex(slide => !slide.title || (!slide.content && !slide.points.length && slide.type !== 'closing'))
  if (incompleteSocialSlide >= 0) {
    throw new Error(`La entrada ${incompleteSocialSlide + 1} de social.slides necesita title y content o points.`)
  }
  const invalidSocialReference = social.slides.findIndex(slide => slide.sectionIndexes.some(index => index >= sectionsSource.length))
  if (invalidSocialReference >= 0) {
    throw new Error(`La entrada ${invalidSocialReference + 1} de social.slides hace referencia a una seccion que no existe.`)
  }

  return {
    title,
    subtitle,
    ...(data.visualThemeSnapshot ? {visualThemeSnapshot:validateVisualTheme(data.visualThemeSnapshot)} : {}),
    ...(typeof data.visualThemeId === 'string' && /^[a-z0-9][a-z0-9-]{1,63}$/.test(data.visualThemeId) ? { visualThemeId:data.visualThemeId } : {}),
    ...(Array.isArray(data.titleHighlights) ? { titleHighlights:data.titleHighlights.filter(value=>typeof value==='string').slice(0,30) } : {}),
    content: summary,
    image: String(data?.image || data?.imagen || '').trim(),
    hero: data.hero ? normalizeHomeHero(data.hero) : null,
    categories: mergedCategories,
    sections: normalizeSections(sectionsSource),
    social,
    game: normalizeGameData(data?.game || data?.juego || {}),
    analysis: data?.analysis || data?.analisis || {},
    score: Number(data?.score || data?.nota || data?.analysis?.score || data?.analisis?.score || 0),
    pros: Array.isArray(data?.analysis?.pros) ? data.analysis.pros : Array.isArray(data?.analisis?.pros) ? data.analisis.pros : Array.isArray(data?.pros) ? data.pros : [],
    cons: Array.isArray(data?.analysis?.cons) ? data.analysis.cons : Array.isArray(data?.analisis?.cons) ? data.analisis.cons : Array.isArray(data?.cons) ? data.cons : []
  }
}

const copySocialJsonInstructions = async () => {
  try {
    await navigator.clipboard.writeText(socialJsonInstructions + '\n\nPLANTILLA JSON DE EJEMPLO (reemplaza todo el texto ficticio):\n' + socialJsonExample)
    showEditorToast('Instrucciones copiadas. Pegalas en Chat junto con la informacion verificada del post.')
  } catch {
    showEditorToast('No se pudo copiar. Revisa el permiso del portapapeles.', 'error')
  }
}

const pasteJsonIntoPost = async () => {
  jsonPasteError.value = ''
  try {
    const text = await navigator.clipboard.readText()
    const parsed = parseAiJsonPost(text)
    post.value.title = parsed.title
    if (parsed.visualThemeId) post.value.visualThemeId = parsed.visualThemeId
    if (parsed.visualThemeSnapshot) post.value.visualThemeSnapshot = parsed.visualThemeSnapshot
    if (parsed.titleHighlights) post.value.titleHighlights = parsed.titleHighlights
    if (parsed.hero) post.value.hero = parsed.hero
    post.value.subtitle = parsed.subtitle
    post.value.content = parsed.content
    post.value.image = parsed.image || post.value.image
    const currentSections = Array.isArray(post.value.sections) ? post.value.sections : []
    post.value.sections = parsed.sections.map((section, index) => ({
      ...section,
      image: section.image || currentSections[index]?.image || ''
    }))
    const currentSocial = post.value.social || {}
    const currentSocialSlides = Array.isArray(currentSocial.slides) ? currentSocial.slides : []
    post.value.social = {
      ...parsed.social,
      image: parsed.social.image || currentSocial.image || '',
      slides: parsed.social.slides.map((slide, index) => ({
        ...slide,
        image: slide.image || currentSocialSlides[index]?.image || ''
      }))
    }
    post.value.game = {
      ...parsed.game,
      officialUrl: parsed.game.officialUrl || ''
    }
    post.value.mediaGameName = parsed.game.nameEn || parsed.game.nameEs || post.value.mediaGameName
    selectedCategories.value = parsed.categories.slice(0, 3)
    activeSectionIndex.value = 0

    if (isAnalysisPost.value) {
      ensureAnalysisData()
      if (Array.isArray(parsed.analysis?.criteria) && parsed.analysis.criteria.length) {
        post.value.analysis.criteria = parsed.analysis.criteria.map((item,index) => ({key:String(item.key || 'criterion-'+index),label:String(item.label || 'Criterio '+(index+1)),score:criterionRating(item.score)}))
      }
      post.value.analysis.score = analysisRating(post.value.analysis)
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
  const suggestedQuery = post.value.game?.nameEn || post.value.game?.nameEs || post.value.mediaGameName || post.value.title || ''
  if (igdbQuery.value === suggestedQuery && suggestedQuery.trim().length >= 2 && !igdbImages.value.length) {
    window.setTimeout(() => searchIgdbImages(), 0)
  } else {
    igdbQuery.value = suggestedQuery
  }
}

const searchIgdbImages = async () => {
  const query = igdbQuery.value.trim()
  if (query.length < 2) return
  clearTimeout(igdbSearchTimer)
  const requestId = ++igdbSearchSequence
  igdbLoading.value = true
  igdbError.value = ''
  igdbHasSearched.value = true
  try {
    const response = await fetch('/.netlify/functions/igdb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.error || 'No se pudieron buscar imagenes')
    if (requestId !== igdbSearchSequence) return
    igdbImages.value = data.images || []
    igdbGames.value = data.games || (data.game ? [{ ...data.game, imageCount: data.images?.length || 0 }] : [])
    selectedIgdbImage.value = igdbImages.value[0] || null
    igdbGameFilter.value = 'all'
    igdbTypeFilter.value = 'all'
    post.value.mediaGameName = data.game?.name || query
  } catch (error) {
    if (requestId !== igdbSearchSequence) return
    console.error(error)
    igdbError.value = error.message || 'No se pudieron buscar imagenes'
  } finally {
    if (requestId === igdbSearchSequence) igdbLoading.value = false
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

const selectImageTarget = (target) => {
  imageTargetId.value = target.id
  selectedIgdbImage.value = igdbImages.value.find(image => image.url === target.url) || activeIgdbImage.value
}

const assignedLabel = (url) => {
  const target = imageTargets.value.find(item => item.url === url)
  return target?.label || ''
}

const savePost = async (targetStatus = 'pending') => {
  if (!post.value.title.trim()) return showEditorToast('El titulo es obligatorio', 'error')
  if (targetStatus !== 'draft' && !isInitialFlowComplete.value) {
    openAccordions.value = ['main']
    return showEditorToast('Completa titulo, resumen y portada antes de publicar.', 'error')
  }
  if (!selectedCategories.value.length) return showEditorToast('Selecciona al menos una categoria', 'error')

  savingTargetStatus.value = targetStatus
  loading.value = true
  try {
    const user = auth.currentUser
    const cleanPost = JSON.parse(JSON.stringify(post.value))
    if (!cleanPost.visualThemeId || cleanPost.visualThemeId === previewTheme.value.id) {
      cleanPost.visualThemeId = previewTheme.value.id
      cleanPost.visualThemeSnapshot = validateVisualTheme(previewTheme.value)
    }
    delete cleanPost.stickers
    cleanPost.sections = normalizeSections(cleanPost.sections, { dropEmpty: !isHeroMode.value })
    cleanPost.hero = normalizeHomeHero(cleanPost.hero)
    if (cleanPost.homePinned === true && !cleanPost.homePinnedAt) cleanPost.homePinnedAt = Date.now()
    cleanPost.social = normalizeSocialContent(cleanPost.social)
    cleanPost.game = normalizeGameData({
      ...cleanPost.game
    })
    if (!cleanPost.game.nameEs && !cleanPost.game.nameEn && !cleanPost.game.platforms.length && !cleanPost.game.releaseDate && !cleanPost.game.officialUrl && !cleanPost.game.cover && !cleanPost.game.developer && !cleanPost.game.genres.length) {
      delete cleanPost.game
    }
    if (cleanPost.game) {
      cleanPost.mediaGameName = cleanPost.game.nameEn || cleanPost.game.nameEs || cleanPost.mediaGameName
    }
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
        criteria: cleanPost.analysis.criteria.map(item => ({...item,score:criterionRating(item.score)})),
        hypeTitle: String(cleanPost.analysis?.hypeTitle || '').trim(),
        pros: String(cleanPost.analysis?.prosText || '').split('\n').map(item => item.trim()).filter(Boolean),
        cons: String(cleanPost.analysis?.consText || '').split('\n').map(item => item.trim()).filter(Boolean)
      }
    } else {
      delete cleanPost.analysis
    }

    if (isHeroMode.value) cleanPost.sections = []

    if (props.editData) {
      const nextUpdatedAt = Date.now()
      const patch = {
        ...cleanPost,
        stickers: deleteField(),
        updatedAt: nextUpdatedAt,
        ...(props.editData.status === 'approved' ? { publishedAt: cleanPost.publishedAt || props.editData.publishedAt || nextUpdatedAt } : {})
      }
      if (props.editData.status === 'approved' && cleanPost.homePinned === true) {
        const snapshot = await getDocs(collection(db, 'posts'))
        const candidates = snapshot.docs.map(item => ({ ...item.data(), ...(item.id === props.editData.id ? cleanPost : {}), id: item.id }))
        const batch = writeBatch(db)
        batch.update(doc(db, 'posts', props.editData.id), patch)
        homePinOverflow(candidates).forEach(item => batch.update(doc(db, 'posts', item.id), { homePinned: false, homePinnedAt: 0 }))
        await batch.commit()
      } else {
        await updateDoc(doc(db, 'posts', props.editData.id), patch)
      }
    } else {
      const createdAt = Date.now()
      await addDoc(collection(db, 'posts'), {
        ...cleanPost,
        authorId: user?.uid || 'anon',
        authorName: user?.displayName || 'Admin',
        status: targetStatus === 'draft' ? 'draft' : 'pending',
        createdAt,
        updatedAt: createdAt
      })
    }

    clearPublicPageCache()
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
    showEditorToast('Error al guardar. Intentalo de nuevo.', 'error')
    loading.value = false
  }
}
</script>

<style scoped>
.home-pin-option{display:flex;align-items:center;flex-wrap:wrap;gap:10px;padding:14px;border:1px solid #a855f755;border-radius:14px;background:#7c3aed12;font-weight:700;font-size:13px}
.home-pin-option input{accent-color:#9333ea;width:18px;height:18px}
.home-pin-option small{flex-basis:100%;font-weight:400;color:var(--text-secondary);line-height:1.5}
.post-editor-page {
  background: var(--admin-bg);
  width: 100%;
  min-height: 100svh;
  position: relative;
}

.post-editor-panel {
  background: var(--admin-surface);
  border:
    1px solid
    rgba(168, 85, 247, 0.28);
  border-radius: 22px;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.5);
  color: var(--text-primary);
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
  background: var(--admin-surface);
  border-bottom: 1px solid var(--border);
  display: grid;
  gap: 16px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 14px 18px;
  position: sticky;
  top: 0;
  z-index: 20;
}

.editor-title-block h2 {
  color: var(--text-primary);
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
  color: var(--text-muted);
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
  background: var(--admin-surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

.utility-btn:hover,
.draft-btn:hover,
.back-btn:hover {
  border-color: #c4b5fd;
  color: var(--accent-hover);
}

.publish-top-btn {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  color: #ffffff;
}

.panel-close-btn {
  background: var(--admin-bg);
  color: #94a3b8;
  height: 40px;
  padding: 0;
  width: 40px;
}

.mobile-stepper {
  display: none;
}

.editor-accordion {
  background: var(--admin-surface);
  border: 1px solid var(--border);
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
    linear-gradient(180deg, var(--admin-surface), var(--admin-surface-raised));
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
  background: var(--admin-surface);
  box-shadow: 0 20px 54px rgba(15, 23, 42, 0.08);
}

.editor-accordion:not(:has(.accordion-body:not([style*='display: none']))) {
  box-shadow: none;
}

.info-column:has(.accordion-body:not([style*='display: none'])) .editor-accordion:not(:has(.accordion-body:not([style*='display: none']))) {
  background: linear-gradient(180deg, var(--admin-surface-raised), var(--admin-surface-raised));
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035);
  opacity: 0.9;
}

.info-column:has(.accordion-body:not([style*='display: none'])) .editor-accordion:not(:has(.accordion-body:not([style*='display: none']))) .accordion-trigger {
  min-height: 58px;
  padding-block: 11px;
}

.accordion-trigger {
  align-items: center;
  color: var(--text-primary);
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
  color: var(--text-muted);
  display: block;
  font-size: 11px;
  font-weight: 750;
  margin-top: 2px;
}

.accordion-icon {
  align-items: center;
  background: var(--admin-surface-raised);
  border-radius: 12px;
  color: #9333ea;
  display: flex;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.accordion-lock {
  background: var(--admin-surface-raised);
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
  background: var(--admin-surface);
  border-color: rgba(226, 232, 240, 0.8);
  filter: saturate(0.82);
  opacity: 0.62;
}

.editor-accordion.gated .accordion-icon {
  background: var(--admin-surface-raised);
  color: #94a3b8;
}

.editor-accordion.gated .accordion-lock {
  background: var(--admin-bg);
  border-color: var(--border);
  color: #94a3b8;
}

.accordion-body {
  border-top: 1px solid var(--admin-surface-raised);
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

.game-platform-date-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr);
}

.game-platform-editor {
  display: grid;
  gap: 9px;
}

.game-platform-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.game-platform-item {
  align-items: stretch;
  background: var(--admin-surface-raised);
  border: 1px solid #c084fc;
  border-radius: 10px;
  display: flex;
  overflow: hidden;
}

.game-platform-item.pending {
  background: var(--admin-bg);
  border-color: #cbd5e1;
}

.game-platform-item > button:first-child {
  align-items: center;
  color: #6d28d9;
  display: inline-flex;
  font-size: 11px;
  font-weight: 900;
  gap: 6px;
  min-height: 38px;
  padding: 0 8px 0 10px;
}

.game-platform-item.pending > button:first-child {
  color: var(--text-muted);
}

.game-platform-item small {
  background: rgba(124, 58, 237, 0.1);
  border-radius: 999px;
  font-size: 8px;
  padding: 3px 5px;
  text-transform: uppercase;
}

.game-platform-item.pending small {
  background: var(--border);
}

.game-platform-item .remove-platform {
  border-left: 1px solid rgba(148, 163, 184, 0.28);
  color: #94a3b8;
  min-width: 30px;
}

.game-platform-editor > p {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 750;
  margin: 0;
}

.featured-field .input-shell {
  min-height: 48px;
}

.summary-field .textarea-shell {
  align-items: stretch;
  background: linear-gradient(180deg, var(--admin-surface), var(--admin-bg));
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
  background: linear-gradient(180deg, var(--admin-surface), var(--admin-bg));
  border: 1px solid var(--border);
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
  color: var(--text-muted);
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
  color: var(--text-secondary);
  display: grid;
  gap: 6px;
  justify-items: center;
  margin: 4px 0 10px;
  padding: 24px;
  text-align: center;
}

.flow-lock-card i {
  align-items: center;
  background: var(--admin-surface-raised);
  border-radius: 999px;
  color: #9333ea;
  display: flex;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.flow-lock-card strong {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 950;
}

.flow-lock-card span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 750;
  max-width: 360px;
}

.editor-layout {
  background: linear-gradient(180deg, var(--admin-surface) 0%, var(--admin-bg) 100%);
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(240px, 0.8fr) minmax(0, 1.3fr) minmax(280px, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 22px 26px;
}

.preview-collapsed .editor-layout {
  grid-template-columns: minmax(240px, 0.8fr) minmax(0, 1.8fr);
}

.hero-editor-layout {
  grid-template-columns: 1fr;
}

.editor-column {
  min-width: 0;
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
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 950;
}

.field-row {
  justify-content: space-between;
}

.field-row small {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 850;
}

.input-shell {
  align-items: center;
  background: var(--admin-surface);
  border: 1px solid var(--border);
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
  color: var(--text-primary);
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
  background: var(--admin-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-primary);
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
  background: var(--admin-surface-raised);
  border: 1px solid #e9d5ff;
  border-radius: 999px;
  color: var(--accent-hover);
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
  background: var(--admin-bg);
  border: 1px solid var(--border);
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
  background: var(--admin-surface);
  border: 1px solid var(--border);
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
  background: var(--admin-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--accent-hover);
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
    linear-gradient(135deg, var(--admin-surface-raised), #fff7ed);
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
  background: linear-gradient(135deg, var(--admin-surface-raised), #eef2ff);
  border: 1px solid #ddd6fe;
  border-radius: 18px;
  display: grid;
  gap: 12px;
  padding: 16px;
}

.release-toggle {
  align-items: center;
  color: var(--text-secondary);
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
  background: var(--admin-surface);
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
  color: var(--accent-hover);
  font-size: 11px;
  font-weight: 950;
}

.analysis-editor-head h3 {
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 950;
}

.score-editor-row {
  align-items: center;
  background: var(--admin-surface-raised);
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
  color: var(--text-primary);
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
  color: var(--text-secondary);
  display: grid;
  font-size: 11px;
  font-weight: 900;
  gap: 6px;
}

.analysis-criteria-grid input,
.analysis-pros-cons textarea {
  background: var(--admin-surface);
  border: 1px solid #e9d5ff;
  border-radius: 12px;
  color: var(--text-primary);
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
  background: var(--admin-surface-raised);
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
  background: var(--admin-surface-raised);
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
  background: var(--admin-surface-raised);
  border: 1px solid var(--border);
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
  background: var(--admin-surface);
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
  background: var(--admin-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-secondary);
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
  background: var(--admin-surface-raised);
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
  background: var(--admin-surface-raised);
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
  background: var(--admin-surface);
  border: 1px solid #e9edf5;
  border-radius: 12px;
  padding: 10px 12px;
  width: 100%;
}

.writing-toolbar {
  align-items: center;
  background: var(--admin-surface);
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
  color: var(--text-secondary);
  display: inline-flex;
  height: 30px;
  justify-content: center;
  transition: background 0.18s ease, color 0.18s ease;
  width: 30px;
}

.writing-toolbar button:hover {
  background: var(--admin-surface-raised);
  color: #9333ea;
}

.section-copy textarea {
  min-height: 128px;
  resize: vertical;
}

.section-copy strong {
  color: var(--text-primary);
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
  color: var(--text-muted);
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
  background: var(--admin-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-secondary);
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
  background: var(--admin-surface);
  border-radius: 18px;
  padding: 0;
}

.preview-head {
  justify-content: space-between;
}

.preview-device-switch {
  align-items: center;
  background: var(--admin-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  display: inline-flex;
  gap: 4px;
  padding: 4px;
}

.preview-device-switch button {
  align-items: center;
  border-radius: 9px;
  color: var(--text-muted);
  display: flex;
  height: 30px;
  justify-content: center;
  width: 30px;
}

.preview-device-switch button.active {
  background: var(--admin-surface);
  color: #9333ea;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.post-live-preview {
  background:
    radial-gradient(circle at 18% 0%, rgba(168, 85, 247, 0.16), transparent 34%),
    linear-gradient(180deg, #020617, #0f172a);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18);
  display: grid;
  gap: 18px;
  padding: 16px;
}

.post-live-preview.preview-tablet {
  justify-self: center;
  max-width: 620px;
}

.post-live-preview.preview-mobile {
  justify-self: center;
  max-width: 390px;
  padding: 0 0 16px;
  overflow: hidden;
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
  color: var(--text-primary);
  font-size: 24px;
  font-weight: 950;
  line-height: 1.12;
}

.post-live-preview.analysis-tier-gold,
.post-live-preview.analysis-tier-legendary {
  background:
    radial-gradient(circle at 52% 0%, rgba(250, 204, 21, 0.12), transparent 34%),
    linear-gradient(180deg, var(--admin-surface), var(--admin-surface-raised));
  border-color: rgba(245, 158, 11, 0.42);
  box-shadow: 0 22px 68px rgba(120, 53, 15, 0.16);
}

.post-live-preview.analysis-tier-legendary {
  background:
    radial-gradient(circle at 12% 0%, var(--admin-surface-raised), transparent 22%),
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
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 750;
  line-height: 1.5;
}

.rich-content {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 750;
  line-height: 1.62;
}

.rich-content :deep(p) {
  margin: 0 0 10px;
}

.rich-content :deep(strong) {
  color: var(--text-primary);
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
  counter-reset: editor-list;
  display: grid;
  gap: 8px;
  margin: 10px 0 14px;
  padding: 0;
}

.rich-content :deep(li) {
  color: var(--text-secondary);
  list-style: none;
  padding: 0 0 7px 28px;
  position: relative;
}

.rich-content :deep(li::before) {
  background: radial-gradient(circle, var(--admin-surface-raised) 0 28%, #f59e0b 42%, #a855f7 82%);
  border-radius: 999px;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.28), 0 0 22px rgba(168, 85, 247, 0.2);
  content: "";
  height: 8px;
  left: 4px;
  position: absolute;
  top: 0.72em;
  transform: translateY(-50%);
  width: 8px;
}

.rich-content :deep(li::after) {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.28), rgba(168, 85, 247, 0.14), transparent);
  border-radius: 999px;
  bottom: 0;
  content: "";
  height: 1px;
  left: 28px;
  position: absolute;
  right: 0;
}

.rich-content :deep(ol > li) {
  counter-increment: editor-list;
  padding-left: 38px;
}

.rich-content :deep(ol > li::before) {
  align-items: center;
  background: linear-gradient(135deg, #facc15, #a855f7);
  color: #ffffff;
  content: counter(editor-list);
  display: inline-flex;
  font-size: 10px;
  font-weight: 950;
  height: 22px;
  justify-content: center;
  left: 0;
  line-height: 1;
  top: 0.76em;
  width: 22px;
}

.rich-content :deep(blockquote) {
  background: var(--admin-surface-raised);
  border-left: 4px solid #a855f7;
  border-radius: 10px;
  color: var(--text-secondary);
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
  color: var(--text-muted);
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
  margin: 6px 0 4px;
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
  background: var(--admin-bg);
  color: #a78bfa;
  display: grid;
  min-height: 210px;
  place-items: center;
}

.preview-section {
  display: grid;
  gap: 8px;
  padding: 0 4px;
}

.preview-section-subtitle {
  color: var(--accent-hover);
  font-size: 14px;
  font-weight: 900;
  line-height: 1.35;
  margin: 0;
}

.preview-section h2 {
  color: #ffffff;
  font-size: 16px;
  font-weight: 950;
}

.post-live-preview .preview-section-copy,
.post-live-preview .preview-section-copy.rich-content,
.post-live-preview .preview-section p {
  color: #cbd5e1;
}

.preview-score-card {
  background: var(--admin-surface-raised);
  border: 1px solid #e9d5ff;
  border-radius: 16px;
  display: grid;
  gap: 8px;
  padding: 14px;
}

.preview-score-card > strong {
  color: var(--accent-hover);
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
  color: var(--text-muted);
  display: grid;
  font-size: 10px;
  font-weight: 850;
  gap: 4px;
}

.preview-score-card b {
  color: var(--text-primary);
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
  background: var(--admin-surface);
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
  color: var(--accent-hover);
  font-size: 11px;
  font-weight: 950;
}

.image-picker-panel header h2 {
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 950;
}

.image-picker-panel header p {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 750;
}

.image-picker-panel header button {
  background: var(--admin-bg);
  border-radius: 999px;
  color: var(--text-muted);
  height: 38px;
  width: 38px;
}

.igdb-search-row {
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.igdb-search-row input {
  background: var(--admin-bg);
  border: 1px solid var(--border);
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

.igdb-search-hint {
  align-items: center;
  color: var(--text-muted);
  display: flex;
  font-size: 11px;
  font-weight: 750;
  gap: 7px;
  margin-top: -4px;
}

.igdb-search-hint i {
  color: #a855f7;
}

.igdb-game-matches {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 2px 5px;
}

.igdb-game-matches button {
  align-items: center;
  background: var(--admin-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-secondary);
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 900;
  gap: 8px;
  min-height: 36px;
  padding: 0 11px;
}

.igdb-game-matches button.active {
  background: #111827;
  border-color: var(--text-primary);
  color: #ffffff;
}

.igdb-game-matches span {
  background: rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  font-size: 10px;
  min-width: 22px;
  padding: 3px 6px;
  text-align: center;
}

.igdb-picker-workspace {
  display: grid;
  gap: 14px;
  grid-template-columns: 220px minmax(0, 1fr) 280px;
  height: min(540px, calc(100dvh - 300px));
  min-height: 320px;
  overflow: hidden;
}

.igdb-targets,
.igdb-results-pane,
.igdb-selection-pane {
  border: 1px solid var(--border);
  border-radius: 14px;
  min-height: 0;
}

.igdb-targets,
.igdb-selection-pane {
  align-content: start;
  display: grid;
  gap: 8px;
  padding: 12px;
}

.igdb-targets { overflow-y: auto; }

.igdb-pane-title {
  align-items: center;
  color: #1e293b;
  display: flex;
  font-size: 11px;
  font-weight: 950;
  justify-content: space-between;
  min-height: 28px;
  text-transform: uppercase;
}

.igdb-pane-title small {
  color: #94a3b8;
  font-size: 9px;
  text-transform: none;
}

.igdb-targets > button {
  align-items: center;
  background: var(--admin-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-muted);
  display: grid;
  gap: 9px;
  grid-template-columns: 38px minmax(0, 1fr) 12px;
  min-height: 50px;
  padding: 6px;
  text-align: left;
  width: 100%;
}

.igdb-targets > button.active {
  background: var(--admin-surface-raised);
  border-color: #a855f7;
  color: var(--accent-hover);
}

.igdb-targets > button img,
.igdb-targets > button > b {
  align-items: center;
  aspect-ratio: 1;
  background: var(--admin-surface-raised);
  border-radius: 7px;
  display: flex;
  font-size: 12px;
  justify-content: center;
  object-fit: cover;
  overflow: hidden;
  width: 38px;
}

.igdb-targets > button span { min-width: 0; }
.igdb-targets > button strong,
.igdb-targets > button small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.igdb-targets > button strong { color: #1e293b; font-size: 11px; }
.igdb-targets > button small { color: #94a3b8; font-size: 9px; margin-top: 2px; }
.igdb-targets > button.filled > i { color: #16a34a; }

.igdb-results-pane {
  display: grid;
  gap: 10px;
  grid-template-rows: auto auto minmax(0, 1fr);
  overflow: hidden;
  padding: 12px;
}

.igdb-filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.igdb-filter-tabs button {
  align-items: center;
  background: var(--admin-surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-secondary);
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
}

.igdb-filter-tabs button.active {
  background: var(--admin-surface-raised);
  border-color: #a855f7;
  color: var(--accent-hover);
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
  background: var(--admin-bg);
  border-radius: 14px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 850;
  padding: 24px;
  text-align: center;
}

.igdb-gallery {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.igdb-gallery > button {
  aspect-ratio: 16 / 10;
  background: var(--border);
  border: 2px solid transparent;
  border-radius: 10px;
  overflow: hidden;
  padding: 0;
  position: relative;
}

.igdb-gallery > button.active {
  border-color: #a855f7;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.12);
}

.igdb-gallery > button img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.igdb-gallery > button > span {
  align-items: center;
  background: rgba(3, 7, 18, 0.78);
  border-radius: 6px;
  bottom: 6px;
  color: #ffffff;
  display: inline-flex;
  font-size: 9px;
  font-weight: 900;
  gap: 5px;
  left: 6px;
  padding: 4px 6px;
  position: absolute;
}

.igdb-gallery > button > em {
  align-items: center;
  background: #8b5cf6;
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  font-size: 9px;
  height: 22px;
  justify-content: center;
  position: absolute;
  right: 6px;
  top: 6px;
  width: 22px;
}

.igdb-selection-pane > img {
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  object-fit: cover;
  width: 100%;
}

.igdb-selection-copy { display: grid; gap: 3px; }
.igdb-selection-copy strong { color: var(--text-primary); font-size: 13px; line-height: 1.25; }
.igdb-selection-copy span { color: var(--accent-hover); font-size: 10px; font-weight: 900; text-transform: uppercase; }

.igdb-use-image {
  align-items: center;
  background: linear-gradient(135deg, #9333ea, #7c3aed);
  border-radius: 10px;
  color: #ffffff;
  display: flex;
  font-size: 11px;
  font-weight: 950;
  gap: 7px;
  justify-content: center;
  min-height: 42px;
  padding: 8px 10px;
}

.igdb-selection-pane > a {
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-secondary);
  display: flex;
  font-size: 10px;
  font-weight: 900;
  gap: 6px;
  justify-content: center;
  min-height: 36px;
  text-decoration: none;
}

.igdb-selection-pane > p {
  background: var(--admin-surface-raised);
  border-radius: 10px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 750;
  line-height: 1.4;
  margin: 4px 0 0;
  padding: 10px;
}

.igdb-selection-pane > p i { color: #f59e0b; margin-right: 5px; }

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
  background:
    radial-gradient(circle at 18% 16%, rgba(124, 58, 237, 0.28), transparent 30%),
    radial-gradient(circle at 78% 24%, rgba(236, 72, 153, 0.18), transparent 28%),
    linear-gradient(180deg, #050816, #07071c 58%, #09061a);
}

.editor-loading-cover :deep(.galaxy-loader) {
  height: 100vh;
  height: 100dvh;
  inset: 0;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 24px;
  position: fixed;
  width: 100vw;
  background:
    radial-gradient(circle at 22% 18%, rgba(147, 51, 234, 0.26), transparent 30%),
    radial-gradient(circle at 76% 24%, rgba(236, 72, 153, 0.18), transparent 28%),
    radial-gradient(circle at 50% 86%, rgba(34, 211, 238, 0.1), transparent 30%),
    linear-gradient(180deg, #050816, #07071c 58%, #09061a);
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

@media (min-width: 761px) and (max-width: 1440px) {
  .post-editor-page { padding: 12px; }
  .post-editor-panel { width: 100%; max-width: 100%; height: calc(100dvh - 24px); max-height: calc(100dvh - 24px); }
  .editor-topbar { grid-template-columns: auto minmax(0, 1fr); gap: 10px; }
  .editor-actions-top { grid-column: 1 / -1; flex-wrap: wrap; }
  .editor-layout { padding: 16px; gap: 16px; overflow-y: auto; align-content: start; }
  .editor-column { height: auto; max-height: none; overflow: visible; }
  .preview-column { min-height: 420px; }
}

@media (max-width: 1440px) {
  .editor-layout,
  .preview-collapsed .editor-layout {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  }

  .preview-column {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .post-editor-page {
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
    background: var(--admin-surface);
    border-bottom: 1px solid var(--border);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    padding: 10px 14px;
  }

  .mobile-stepper button {
    align-items: center;
    color: var(--text-muted);
    display: grid;
    font-size: 10px;
    font-weight: 850;
    gap: 4px;
    justify-items: center;
  }

  .mobile-stepper span {
    align-items: center;
    background: var(--border);
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
    height: 100dvh;
    max-height: 100dvh;
    max-width: 100vw;
    overflow-y: auto;
    width: 100vw;
  }

  .igdb-search-row {
    grid-template-columns: 1fr;
  }

  .igdb-picker-workspace {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
    min-height: 0;
    overflow: visible;
  }

  .igdb-targets {
    display: flex;
    overflow-x: auto;
  }

  .igdb-targets .igdb-pane-title {
    display: none;
  }

  .igdb-targets > button {
    flex: 0 0 min(240px, 72vw);
  }

  .igdb-results-pane {
    overflow: visible;
  }

  .igdb-gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-height: 52dvh;
  }

  .igdb-selection-pane {
    padding-bottom: calc(18px + env(safe-area-inset-bottom));
  }

  .mobile-editor-actionbar {
    align-items: center;
    backdrop-filter: blur(18px);
    background: var(--admin-surface);
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
    background: var(--admin-surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    color: var(--text-secondary);
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

@media (min-width: 761px) and (max-width: 1000px) {
  .editor-layout, .preview-collapsed .editor-layout { grid-template-columns: minmax(0, 1fr); }
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

.editor-actions-top{flex-wrap:wrap}
</style>

<style scoped>
/* The route owns the viewport; the editor no longer sits in an overlay. */
.post-editor-page{display:block;position:relative;inset:auto;padding:0;width:100%;background:var(--admin-bg);backdrop-filter:none;z-index:auto}
.post-editor-page .post-editor-panel{width:100%;max-width:none;height:100dvh;max-height:100dvh;border:0;border-radius:0;box-shadow:none;grid-template-rows:auto minmax(0,1fr)}
.post-editor-page .editor-layout{height:100%;max-height:100%;box-sizing:border-box}
.post-editor-page .hero-editor-panel{max-width:none}
@media(min-width:761px) and (max-width:1440px){.post-editor-page .editor-layout{height:auto}}
@media(max-width:760px){.post-editor-page .post-editor-panel{grid-template-rows:auto auto minmax(0,1fr)}.post-editor-page .hero-editor-panel{grid-template-rows:auto minmax(0,1fr)}}
</style>

<style scoped>
.hero-media-settings{display:grid;padding:16px;border:1px solid var(--border);border-radius:14px;background:var(--admin-surface);color:var(--text-primary)}.hero-media-settings summary{font-weight:800;cursor:pointer}.hero-media-settings p{font-size:12px;color:var(--text-secondary);line-height:1.5;margin:12px 0}.hero-media-settings .field-group{margin-top:12px}
</style>

<style scoped>
.editor-layout,.editor-column,.section-stack,.section-copy{min-width:0}
.post-section-card,.post-section-card.has-media,.post-section-card.active,.post-section-card.active.has-media,.post-section-card:not(.active),.post-section-card:not(.active).has-media{grid-template-columns:38px minmax(0,1fr);gap:12px;min-width:0;min-height:0}
.section-media-tools{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;align-items:center;min-width:0}

.post-section-card .section-card-media,.post-section-card.active .section-card-media,.post-section-card:not(.active) .section-card-media{display:block;grid-column:auto;align-self:center;width:72px;height:56px;min-height:0;max-height:56px;flex-shrink:0;background:var(--admin-bg);border:1px solid var(--border)}
.section-media-status{position:absolute;inset:auto 0 0;padding:3px 2px;background:#050816df;color:#e2e8f0;text-align:center;font-size:8px;line-height:1.2;white-space:nowrap}
.section-card-media[data-state=error]{border-color:#fb7185}.section-card-media[data-state=error] .section-media-status{color:#fda4af}
.post-section-card:not(.active).has-media .section-copy{grid-template-columns:minmax(0,1fr)72px}
.post-section-card:not(.active).has-media .section-copy>.section-card-head,.post-section-card:not(.active).has-media .section-copy>strong,.post-section-card:not(.active).has-media .section-copy>p{grid-column:1}
.post-section-card:not(.active).has-media .section-media-tools{display:block;grid-column:2;grid-row:1 / 4;align-self:center}
.section-image-row{grid-template-columns:minmax(0,1fr)72px;min-width:0;align-items:start}
.section-image-row>.section-media-picker{width:72px;height:56px;padding:0;margin:0;overflow:hidden;position:relative;border-radius:10px}
.post-section-card:not(.active) .section-image-row{display:block}
.post-section-card .section-image-row>.section-media-picker .section-card-media{position:absolute;inset:0;width:100%;height:100%;min-height:0;max-height:100%;max-width:100%;border:0;border-radius:inherit}
.section-media-picker{min-width:0;max-width:100%;isolation:isolate}
.section-media-tools,.section-image-row{max-width:100%;min-width:0}
.post-section-card:not(.active){padding:12px;min-height:88px}
.post-section-card:not(.active) .section-copy{overflow:hidden;gap:4px;min-width:0;max-width:100%;grid-template-columns:minmax(0,1fr)}
.post-section-card:not(.active) .section-copy>strong,.post-section-card:not(.active) .section-copy>p{display:block;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0}
.post-section-card:not(.active) .section-copy>strong{max-width:min(100%,64ch)}
.post-section-card:not(.active) .section-copy>p{max-width:min(100%,85ch)}
.post-section-card:not(.active) .section-card-head{min-width:0;overflow:hidden}
.post-section-card:not(.active) .section-card-head small{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.post-section-card:not(.active) .section-visible-toggle{flex-shrink:0}
.cover-preview-card{height:112px;min-height:0;max-height:112px}
.cover-preview-card img,.cover-preview-card video,.cover-preview-card iframe{height:100%;max-height:112px;object-fit:cover}
.cover-actions{grid-template-columns:minmax(0,1fr)}
.cover-url-control{min-width:0}
@media(min-width:761px) and (max-width:1440px){
 .editor-layout{height:auto;max-height:100%;grid-auto-rows:max-content;align-content:start}
 .editor-column{height:auto;max-height:none;grid-auto-rows:max-content;overflow:visible}
 .section-stack{grid-auto-rows:max-content}
}
@media(max-width:760px){
 .post-section-card,.post-section-card.active,.post-section-card.active.has-media{padding:10px;gap:8px;grid-template-columns:32px minmax(0,1fr)}

 .post-section-card .section-card-media,.post-section-card.active .section-card-media,.post-section-card:not(.active) .section-card-media{width:56px;height:48px;max-height:48px}
 .post-section-card:not(.active).has-media .section-copy{grid-template-columns:minmax(0,1fr)56px}
 .section-image-row{grid-template-columns:minmax(0,1fr)56px;gap:6px}
 .section-image-row>.section-media-picker{width:56px;height:48px}
 .section-visible-toggle em{display:none}
}
</style>

<style scoped>
/* Surfaces establish groups; reserve strong edges for keyboard focus. */
.field-group input,.field-group textarea,.field-group select{border-color:color-mix(in srgb,var(--text-secondary,#94a3b8) 15%,transparent);box-shadow:none}
.field-group input:focus,.field-group textarea:focus,.field-group select:focus{outline:2px solid #a855f7;outline-offset:1px}
.content-column{background:var(--admin-bg,#101629);border-color:transparent}
.section-stack{gap:12px}
.post-section-card,.post-section-card:not(.active){border:1px solid transparent;background:var(--admin-surface,#151d31);box-shadow:none;border-radius:14px;transition:background .16s ease,border-color .16s ease}
.post-section-card:hover{transform:none;background:var(--admin-surface-raised,#1c263e)}
.post-section-card.active{border-color:color-mix(in srgb,#a855f7 24%,transparent);background:var(--admin-surface,#151d31);box-shadow:inset 3px 0 #a855f7}
.section-copy input,.section-copy textarea{border:1px solid transparent;background:color-mix(in srgb,var(--admin-bg,#0b1222) 65%,var(--admin-surface,#151d31));border-radius:8px;box-sizing:border-box;color:var(--text-primary);line-height:1.65}
.section-copy .section-title-input{background:transparent;font-size:17px;font-weight:750;padding:8px 10px}
.section-copy input:focus,.section-copy textarea:focus{outline:2px solid #a855f7;outline-offset:1px}
.section-copy input::placeholder,.section-copy textarea::placeholder{color:var(--text-secondary,#94a3b8);font-weight:400}
.writing-toolbar{border:0;border-radius:10px 10px 0 0;background:color-mix(in srgb,var(--admin-bg,#0b1222) 65%,var(--admin-surface,#151d31));margin-bottom:-8px;padding:8px 10px 4px;position:relative}
.writing-toolbar+textarea{border-radius:0 0 10px 10px;min-height:180px;padding:12px 14px;font-weight:400;font-size:14px;line-height:1.85}
.writing-toolbar button{border:0;background:transparent}
.writing-toolbar button:focus-visible,.section-side-rail button:focus-visible{outline:2px solid #a855f7;outline-offset:2px}
.section-image-row{border:0;background:transparent;padding:6px 0 0;border-radius:0}
.section-side-rail button{border-color:transparent;background:transparent}
.section-side-rail button:hover{background:#a855f71a}
.section-card-head small{background:transparent;color:#bf9be8;padding-left:0;letter-spacing:.04em}
.section-card-media,.post-section-card .section-card-media{border-color:transparent}
.section-copy :deep(.clipboard-url button){border-color:transparent;background:var(--admin-surface-raised,#202b42)}
.section-copy :deep(.clipboard-value){opacity:.65}
@media(prefers-reduced-motion:reduce){.post-section-card{transition:none}}
</style>

<style scoped>
.main-accordion>.accordion-body{gap:0;padding:0 20px}
.editor-info-group{display:grid;gap:16px;padding:24px 0;min-width:0}
.editor-info-group+.editor-info-group{border-top:1px solid #ffffff0c}
.info-group-title{margin:0;font-size:14px;font-weight:750;color:var(--text-primary);line-height:1.4}
.info-group-help{margin:0;font-size:12px;font-weight:400;line-height:1.6;color:var(--text-secondary)}
.editor-info-group .field-group{min-width:0;margin:0}
.main-accordion .input-shell{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:10px 12px;background:var(--admin-bg,#0b1222);border:1px solid transparent;border-radius:10px}
.main-accordion .input-shell input,.main-accordion .input-shell textarea{border:0;background:transparent;padding:0;width:100%;min-width:0;box-shadow:none;font-size:14px;font-weight:400;line-height:1.65}
.main-accordion .input-shell:focus-within{outline:2px solid #a855f7;outline-offset:1px}
.main-accordion .input-shell input:focus,.main-accordion .input-shell textarea:focus{outline:0}
.main-accordion .textarea-shell{grid-template-columns:minmax(0,1fr);gap:8px}
.main-accordion .textarea-shell textarea{min-height:100px}
.main-accordion .input-shell small{position:static;align-self:end;justify-self:end;font-size:10px;color:var(--text-secondary);padding:0}
.cover-tool .cover-preview-card{width:100%;height:auto;aspect-ratio:16/9;max-height:240px;border:0;border-radius:12px;background:var(--admin-bg,#0b1222)}
.cover-tool .cover-preview-card :is(img,video,iframe){width:100%;height:100%;max-height:none;object-fit:contain}
.cover-tool .cover-actions{display:flex;flex-wrap:wrap;align-items:flex-start;gap:10px;min-width:0}
.cover-tool .cover-actions>button{width:auto;flex:0 0 auto;min-height:40px;padding:8px 14px;border:0;background:#a855f71c;border-radius:10px}
.cover-tool .cover-url-control{flex:1 1 170px;min-width:0}
.cover-tool :deep(.clipboard-value){overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;font-size:10px;opacity:.65}
.editor-info-group .home-pin-option{margin:0;padding:14px;background:var(--admin-bg,#0b1222);border:0;line-height:1.5}
.editor-info-group .hero-media-settings{margin:0;border:0;background:transparent;padding:0}
.editor-info-group .hero-media-settings summary{font-size:12px;color:var(--text-secondary);padding:12px 0}
.editor-info-group :deep(.visual-theme-selector){margin-top:0}
@media(max-width:600px){.main-accordion>.accordion-body{padding:0 14px}.editor-info-group{padding:20px 0}}
</style>

<style scoped>
.image-picker-panel{box-sizing:border-box;grid-template-rows:auto auto auto auto minmax(0,1fr);gap:12px;color:var(--text-primary,#f1f5f9)}
.igdb-picker-workspace{min-width:0;grid-template-columns:210px minmax(0,1fr) 260px;height:min(540px,calc(100dvh - 290px));min-height:0}
.igdb-picker-workspace>*{min-width:0}
.igdb-pane-title,.igdb-targets>button strong{color:var(--text-primary,#f1f5f9)}
.igdb-pane-title small,.igdb-targets>button small{color:var(--text-secondary,#aeb8cb)}
.igdb-targets{grid-auto-rows:max-content;align-content:start}
.igdb-targets>button{border-color:transparent;min-height:62px;background:var(--admin-bg,#0b1222)}
.igdb-targets>button.active{border-color:#a855f7;background:#a855f719}
.igdb-targets>button strong{font-size:12px;font-weight:650;line-height:1.4}
.igdb-targets>button.active strong{color:#dcc4ff}
.igdb-gallery{align-content:start;align-items:start;grid-auto-rows:max-content;gap:12px;scrollbar-gutter:stable;padding:3px 6px 6px 3px}
.igdb-gallery>button{display:block;box-sizing:border-box;width:100%;height:auto;min-height:0;aspect-ratio:16/10;flex:none;isolation:isolate;background:var(--admin-bg,#0b1222)}
.igdb-gallery>button img{position:absolute;inset:0;display:block;width:100%;height:100%;max-height:none;object-fit:contain}
.igdb-gallery>button:focus-visible,.igdb-targets>button:focus-visible,.igdb-filter-tabs button:focus-visible{outline:2px solid #c084fc;outline-offset:2px}
.igdb-selection-pane{overflow-y:auto;background:var(--admin-bg,#0b1222);border-color:transparent}
.igdb-selection-pane>img{object-fit:contain;background:#0003}
.igdb-use-image{white-space:normal;overflow-wrap:anywhere;line-height:1.5}
.igdb-game-matches button{max-width:320px;white-space:normal;text-align:left;line-height:1.4;padding:8px 11px}
@media(min-width:761px) and (max-width:1050px){.igdb-picker-workspace{grid-template-columns:170px minmax(0,1fr) 210px;gap:10px}.igdb-gallery{grid-template-columns:repeat(2,minmax(0,1fr))}.igdb-targets,.igdb-results-pane,.igdb-selection-pane{padding:10px}}
@media(max-width:760px){.image-picker-panel{display:flex;flex-direction:column;gap:12px;padding:16px}.igdb-picker-workspace{display:flex;flex-direction:column;height:auto;overflow:visible;flex-shrink:0}.igdb-targets{display:flex;flex-shrink:0;max-height:100px;padding:8px}.igdb-targets>button{flex:0 0 220px}.igdb-results-pane{display:flex;flex-direction:column;overflow:visible}.igdb-gallery{grid-template-columns:repeat(2,minmax(0,1fr));max-height:45dvh;min-height:140px}.igdb-selection-pane{overflow:visible}.igdb-selection-pane>img{max-height:180px}.igdb-search-row button{min-height:44px}}
</style>

<style scoped>
.analysis-editor{background:var(--admin-bg,#0b1222);border:0;border-radius:12px;padding:18px}
.analysis-criteria-grid>label{border:0;background:var(--admin-surface,#151d31);border-radius:10px;padding:12px;font-weight:600}
.criterion-input{display:flex;align-items:center;gap:5px;min-width:0}.criterion-input input{width:64px!important;border:1px solid #ffffff18;background:var(--admin-bg,#0b1222);color:var(--text-primary);border-radius:8px;min-height:40px;padding:6px!important;box-sizing:border-box}.criterion-input small{font-size:10px;color:var(--text-secondary)}
.analysis-save-hint,.analysis-save-row>span{font-size:12px;line-height:1.6;color:var(--text-secondary);margin:0}
.analysis-save-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px}.analysis-save-row button{background:#7c3aed;color:white;border:0;border-radius:10px;min-height:44px;padding:10px 16px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}.analysis-save-row button:disabled{opacity:.6;cursor:wait}
.analysis-pros-cons>label,.score-editor-row{border-color:#ffffff14;background:var(--admin-surface,#151d31)}
</style>

<style scoped>
.analysis-criteria-grid{grid-template-columns:minmax(0,1fr)}
</style>

<style scoped>
.post-live-preview{padding:0;overflow:hidden;gap:0}
.editorial-preview-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:22px;padding:18px;min-width:0}
.editorial-preview-article,.editorial-preview-sidebar{display:grid;align-content:start;gap:20px;min-width:0}
.preview-reader-tabs{display:flex;gap:4px;overflow-x:auto;background:var(--visual-surface,#11121e);border-radius:14px;padding:6px;min-width:0;max-width:100%}
.preview-reader-tabs button{flex:0 0 auto;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:transparent;border:0;border-radius:999px;padding:10px 12px;font:inherit;font-size:11px;color:var(--text-primary,#f8fafc);cursor:pointer}
.preview-reader-tabs button[aria-pressed=true]{background:var(--visual-label-background,#7024dc);color:var(--visual-label-text,#fff)}
.post-live-preview.analysis .preview-reader-tabs button[aria-pressed=true]{background:#facc15;color:#241800}
.preview-introduction{font-size:14px;line-height:1.8;color:#dbe4f0}.editorial-preview-article .preview-section{padding:0;border:0;background:transparent;min-width:0}
.preview-desktop .editorial-preview-layout{grid-template-columns:minmax(0,1fr) 220px;gap:18px;padding-top:70px}.preview-desktop .editorial-preview-sidebar{position:relative}.preview-desktop .editorial-preview-sidebar>.reader-actions{position:absolute;left:0;top:-60px;width:100%;font-size:10px}
.preview-desktop :deep(.reader-actions){gap:4px}.preview-desktop :deep(.reader-actions button),.preview-desktop :deep(.read-state){padding:0 6px;font-size:9px;gap:4px}
.preview-desktop :deep(.rating-criterion){grid-template-columns:minmax(0,1fr) auto;gap:6px}.preview-desktop :deep(.rating-stars){grid-column:1;grid-row:2}.preview-desktop :deep(.rating-criterion b){grid-column:2;grid-row:2}
.post-live-preview :deep(.is-editorial){border-radius:0;box-shadow:none;border:0}.post-live-preview :deep(.is-editorial .hero-content){min-height:0;padding:24px;grid-template-rows:auto;gap:16px}.post-live-preview :deep(.is-editorial .hero-copy h1){font-size:clamp(26px,3vw,38px)}
.preview-mobile :deep(.is-editorial .hero-breadcrumb){margin-bottom:72px}.preview-mobile :deep(.is-editorial .hero-content){padding:18px}.preview-mobile :deep(.is-editorial .hero-copy h1){font-size:28px}.preview-mobile .editorial-preview-layout{padding:16px}
</style>

<style scoped src="@/assets/styles/editorial-reading.css"></style>
